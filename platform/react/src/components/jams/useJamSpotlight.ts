import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent, type Room } from 'livekit-client';
import { canViewJamAttendees } from '@openpeepshq/common/lib';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useJamContext } from './JamContext';
import { parseSpotlightPayload, senderMaySpotlight } from './speakerLayout';

const SPOTLIGHT_TOPIC = 'jam-spotlight';

const encoder = new TextEncoder();

const publishSpotlight = (room: Room, identity: string | null) =>
  room.localParticipant.publishData(
    encoder.encode(JSON.stringify({ identity })),
    { reliable: true, topic: SPOTLIGHT_TOPIC },
  );

type RoomMetadata = {
  instanceDomain?: string;
  /** Room-wide host spotlight (see `useJamSpotlight`). `null` clears it. */
  spotlightIdentity?: string | null;
};

/**
 * Tri-state: `undefined` = the metadata carries no spotlight info (unknown or
 * unparseable — must be ignored), `null` = an explicit clear, string = the
 * spotlit identity. Do not collapse `undefined` and `null`: the
 * `RoomMetadataChanged` guard relies on ignoring `undefined`, so treating
 * unknown metadata as a clear would accidentally drop the spotlight.
 */
const parseRoomSpotlight = (metadata?: string): string | null | undefined => {
  if (!metadata) return undefined;
  try {
    const parsed = JSON.parse(metadata) as RoomMetadata;
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    if (parsed.spotlightIdentity === null) return null;
    if (typeof parsed.spotlightIdentity === 'string') {
      return parsed.spotlightIdentity;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

export type UseJamSpotlightArgs = {
  room: Room;
  /** Only each participant's `identity` is read. */
  participants: { identity: string }[];
};

/**
 * Room-wide spotlight. Only the jam creator or a jam moderator can set or
 * clear it. Late joiners hear the current spotlight again from one of them.
 *
 * The spotlight is also mirrored to LiveKit room metadata so the recording
 * egress — which joins the room after the spotlight was set and never
 * receives the one-shot data packet — sees it on load. The write goes
 * through the server endpoint `POST /jams/:id/spotlight` (round-tripped per
 * change) rather than the LiveKit SDK, so the spotlight survives the
 * moderator's client disconnecting; every other client follows
 * `roomMetadataChanged` (LiveKit re-sends it to each participant on join).
 *
 * Requires `OpenpeepsProvider` — the metadata write goes through the client
 * API (`openpeepsApi.setJamSpotlightAction`).
 */
export const useJamSpotlight = ({
  room,
  participants,
}: UseJamSpotlightArgs) => {
  const { openpeepsApi } = useOpenpeeps();
  const { jam, jamPost, occurrence } = useJamContext();
  const me = useCurrentProfile();
  const canSpotlight = canViewJamAttendees(me ?? undefined, jamPost);
  const [spotlightIdentity, setSpotlightIdentity] = useState<string | null>(
    null,
  );
  const spotlightRef = useRef(spotlightIdentity);
  spotlightRef.current = spotlightIdentity;
  /**
   * Set after the first reconciliation so the clear-effect doesn't race the
   * mount-time metadata adopt. Do not simplify away: the skip also keeps a
   * non-moderator client from firing the metadata-clear mutation on mount
   * (double-guarded by `canSpotlightRef`) against a not-yet-reconciled roster.
   */
  const settledRef = useRef(false);
  const canSpotlightRef = useRef(canSpotlight);
  canSpotlightRef.current = canSpotlight;
  const creatorIdRef = useRef(jamPost.profile.id);
  creatorIdRef.current = jamPost.profile.id;
  const moderatorIdsRef = useRef(jam.moderators);
  moderatorIdsRef.current = jam.moderators;
  const occurrenceRef = useRef(occurrence);
  occurrenceRef.current = occurrence;
  const occurrenceQuery = () =>
    occurrenceRef.current ? { occurrence: occurrenceRef.current } : undefined;
  const setJamSpotlightActionRef = useRef(
    openpeepsApi.setJamSpotlightAction({ id: jamPost.id }),
  );
  setJamSpotlightActionRef.current = openpeepsApi.setJamSpotlightAction({
    id: jamPost.id,
  });

  useEffect(() => {
    const applySpotlight = (identity: string | null) => {
      if (identity === spotlightRef.current) return;
      setSpotlightIdentity(identity);
    };

    const onData = (
      payload: Uint8Array,
      participant?: { identity?: string },
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== SPOTLIGHT_TOPIC) return;
      if (
        !senderMaySpotlight(
          participant?.identity,
          creatorIdRef.current,
          moderatorIdsRef.current,
        )
      ) {
        return;
      }
      const identity = parseSpotlightPayload(payload);
      if (identity === undefined) return;
      applySpotlight(identity);
    };

    // Room metadata replays to each participant on join, which is what the
    // recording egress needs: its headless browser mounts long after the
    // spotlight data packet was already sent.
    const onRoomMetadataChanged = (metadata: string) => {
      const identity = parseRoomSpotlight(metadata);
      if (identity !== undefined) {
        applySpotlight(identity);
      }
    };

    const onJoin = () => {
      const identity = spotlightRef.current;
      if (!identity || !canSpotlightRef.current) return;
      void publishSpotlight(room, identity).catch(() => undefined);
    };

    const applyInitialMetadata = () => {
      const identity = parseRoomSpotlight(room.metadata);
      if (identity !== undefined) {
        applySpotlight(identity);
      }
    };
    if (room.state === 'connected') {
      applyInitialMetadata();
    }
    room
      .on(RoomEvent.DataReceived, onData)
      .on(RoomEvent.RoomMetadataChanged, onRoomMetadataChanged)
      .on(RoomEvent.ParticipantConnected, onJoin)
      .once(RoomEvent.Connected, applyInitialMetadata);

    return () => {
      room
        .off(RoomEvent.DataReceived, onData)
        .off(RoomEvent.RoomMetadataChanged, onRoomMetadataChanged)
        .off(RoomEvent.ParticipantConnected, onJoin)
        .off(RoomEvent.Connected, applyInitialMetadata);
    };
  }, [room]);

  useEffect(() => {
    if (!spotlightIdentity) return;
    // Skip the first reconciliation: the metadata adopt-effect runs in the
    // same commit with a not-yet-reconciled roster, and treating that as
    // "the spotlit participant left" would clear the spotlight on mount.
    if (!settledRef.current) {
      settledRef.current = true;
      return;
    }
    const stillPresent = participants.some(
      (participant) => participant.identity === spotlightIdentity,
    );
    if (stillPresent) return;
    setSpotlightIdentity(null);
    if (!canSpotlightRef.current) return;
    void publishSpotlight(room, null).catch(() => undefined);
    void setJamSpotlightActionRef
      .current({ identity: null }, undefined, occurrenceQuery())
      .catch(() => undefined);
  }, [participants, room, spotlightIdentity]);

  const setSpotlight = useCallback(
    (identity: string | null) => {
      if (!canSpotlightRef.current) return;
      setSpotlightIdentity(identity);
      void publishSpotlight(room, identity).catch(() => undefined);
      void setJamSpotlightActionRef
        .current({ identity }, undefined, occurrenceQuery())
        .catch(() => undefined);
    },
    [room],
  );

  return { spotlightIdentity, setSpotlight, canSpotlight };
};
