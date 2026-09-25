import { useCallback, useEffect, useRef, useState } from 'react';
import { useParticipants, useRoomContext } from '@livekit/components-react';
import { RoomEvent, type Room } from 'livekit-client';
import { canViewJamAttendees } from '@openpeepshq/common/lib';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useJamContext } from './JamContext';
import { parseSpotlightPayload, senderMaySpotlight } from './speakerLayout';

const SPOTLIGHT_TOPIC = 'jam-spotlight';

const encoder = new TextEncoder();

const publishSpotlight = (room: Room, identity: string | null) =>
  room.localParticipant.publishData(
    encoder.encode(JSON.stringify({ identity })),
    { reliable: true, topic: SPOTLIGHT_TOPIC },
  );

/**
 * Room-wide spotlight. Only the jam creator or a jam moderator can set or
 * clear it. Late joiners hear the current spotlight again from one of them.
 */
export const useJamSpotlight = () => {
  const room = useRoomContext();
  const participants = useParticipants();
  const { jam, jamPost } = useJamContext();
  const me = useCurrentProfile();
  const canSpotlight = canViewJamAttendees(me ?? undefined, jamPost);
  const [spotlightIdentity, setSpotlightIdentity] = useState<string | null>(
    null,
  );
  const spotlightRef = useRef(spotlightIdentity);
  spotlightRef.current = spotlightIdentity;
  const canSpotlightRef = useRef(canSpotlight);
  canSpotlightRef.current = canSpotlight;
  const creatorIdRef = useRef(jamPost.profile.id);
  creatorIdRef.current = jamPost.profile.id;
  const moderatorIdsRef = useRef(jam.moderators);
  moderatorIdsRef.current = jam.moderators;

  useEffect(() => {
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
      setSpotlightIdentity(identity);
    };

    const onJoin = () => {
      const identity = spotlightRef.current;
      if (!identity || !canSpotlightRef.current) return;
      void publishSpotlight(room, identity).catch(() => undefined);
    };

    room
      .on(RoomEvent.DataReceived, onData)
      .on(RoomEvent.ParticipantConnected, onJoin);

    return () => {
      room
        .off(RoomEvent.DataReceived, onData)
        .off(RoomEvent.ParticipantConnected, onJoin);
    };
  }, [room]);

  useEffect(() => {
    if (!spotlightIdentity) return;
    const stillPresent = participants.some(
      (participant) => participant.identity === spotlightIdentity,
    );
    if (stillPresent) return;
    setSpotlightIdentity(null);
    if (!canSpotlightRef.current) return;
    void publishSpotlight(room, null).catch(() => undefined);
  }, [participants, room, spotlightIdentity]);

  const setSpotlight = useCallback(
    (identity: string | null) => {
      if (!canSpotlightRef.current) return;
      setSpotlightIdentity(identity);
      void publishSpotlight(room, identity).catch(() => undefined);
    },
    [room],
  );

  return { spotlightIdentity, setSpotlight, canSpotlight };
};
