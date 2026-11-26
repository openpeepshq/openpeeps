import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Participant, Room } from 'livekit-client';
import type {
  JamWaitingProfile,
  PublicProfile,
} from '@openpeepshq/common/types';
import { matchesQuery, sortByRaisedHand } from '@openpeepshq/common/lib';
import type { SseError } from '@openpeepshq/fetch-client';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useT } from '../../i18n';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { useJamContext } from '../../components/jams/JamContext';
import { parseParticipantMetadata } from '../../components/jams/jamEventActions';
import { useRaisedHands } from '../../components/jams/useJamHands';

export type UseJamPeopleArgs = {
  room: Room;
  participants: Participant[];
  /** Toast routing for a failed lift-ban (both stacks pass their own toast). */
  onLiftError?: (message: string) => void;
  /** Toast feedback for admit/reject outcomes; the caller owns the toast UI. */
  onActionSuccess?: (message: string) => void;
  onActionError?: (message: string) => void;
};

/**
 * People drawer data: searchable in-jam list sorted by raised hand (observers
 * hidden) and, for moderators, the waiting-room profiles with admit and
 * reject.
 */
export const useJamPeople = ({
  room,
  participants,
  onLiftError,
  onActionSuccess,
  onActionError,
}: UseJamPeopleArgs) => {
  const me = useCurrentProfile();
  const t = useT();
  const { jamPost, jam, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const raisedHands = useRaisedHands(room);

  const isModerator = !!me && jam.moderators.includes(me.id);
  const hasWaitingRoom = !!jam.waitingRoom;

  // The waiting-room stream's non-2xx failure (auth expiry, 4xx/5xx) is a
  // non-terminal error: a fresh snapshot clears it. The callback must be
  // referentially stable across renders, so `t` is read through a ref and a
  // single stable closure is handed to the stream (same pattern as the join
  // path in `useJoinWaitingRoomToken`).
  const [waitingRoomError, setWaitingRoomError] = useState<string | null>(null);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  const onWaitingRoomStreamError = useCallback((error?: SseError) => {
    const tNow = tRef.current;
    const fallback = tNow('jams.waitingRoom.streamError', {
      defaultValue: 'Unable to reach the waiting room',
    });
    const message = apiErrorMessage(error, tNow, fallback);
    setWaitingRoomError(message.length > 0 ? message : null);
  }, []);

  const waitingRoom = openpeepsApi.useWaitingRoomStream(
    isModerator && hasWaitingRoom ? jamPost.id : '',
    occurrence,
    onWaitingRoomStreamError,
  );
  const admitParticipant = openpeepsApi.admitParticipantAction();
  const rejectParticipant = openpeepsApi.rejectParticipantAction();
  const liftJamBan = openpeepsApi.liftJamBanAction();

  const [query, setQuery] = useState('');
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [liftingId, setLiftingId] = useState<string | null>(null);

  // Ban list ids only — names are resolved lazily per id by the drawer's
  // banned sublist (one `useProfile(id)` per row, mounted on expand) instead
  // of a full `profiles.list` directory fetch for every moderator.
  const bannedIds = useMemo(
    () => (isModerator ? (jam.banned ?? []) : []),
    [isModerator, jam.banned],
  );

  const listedParticipants = useMemo(() => {
    const visible = participants.filter((participant) => {
      const metadata = parseParticipantMetadata(participant.metadata);
      if (metadata.observer) return false;
      return !query || matchesQuery(metadata.profile, query);
    });
    // `raisedHands` is a reactivity dependency, not read in the memo body:
    // hand state changes arrive as participant metadata updates that don't
    // change the `participants` reference, so listing it is what re-sorts when
    // hands change (the sort itself reads hand state from metadata).
    return sortByRaisedHand(visible, (participant) => participant.metadata);
  }, [participants, query, raisedHands]);

  const waitingProfiles = useMemo((): JamWaitingProfile[] => {
    if (!waitingRoom) return [];
    const q = query.trim().toLowerCase();
    return Object.entries(waitingRoom)
      .map(([profileId, entry]) => ({
        ...entry,
        id: profileId,
      }))
      .filter(
        (profile) =>
          !q ||
          (profile.displayName ?? '').toLowerCase().includes(q) ||
          profile.id.toLowerCase().includes(q),
      );
  }, [waitingRoom, query]);

  // The stream error is non-terminal: the first fresh snapshot after a
  // failure clears it (same semantics as the join path's error state).
  useEffect(() => {
    if (waitingRoom) setWaitingRoomError(null);
  }, [waitingRoom]);

  // Admit and reject share the same flow (busy state, endpoint call with the
  // optional occurrence, success/error toast); only the endpoint, the busy
  // setter, and the two toast keys differ.
  const runWaitingRoomAction = async (
    profile: Pick<PublicProfile, 'id'>,
    action: {
      invoke: () => Promise<unknown>;
      setBusy: (busyId: string | null) => void;
      successKey: string;
      errorKey: string;
    },
  ) => {
    action.setBusy(profile.id);
    try {
      await action.invoke();
      onActionSuccess?.(t(action.successKey));
    } catch {
      onActionError?.(t(action.errorKey));
    } finally {
      action.setBusy(null);
    }
  };

  const admit = (profile: Pick<PublicProfile, 'id'>) =>
    runWaitingRoomAction(profile, {
      invoke: () =>
        admitParticipant(
          { id: jamPost.id, profileId: profile.id },
          occurrence ? { occurrence } : undefined,
        ),
      setBusy: setAdmittingId,
      successKey: 'jams.waitingRoom.admitSuccess',
      errorKey: 'jams.waitingRoom.admitError',
    });

  const reject = (profile: Pick<PublicProfile, 'id'>) =>
    runWaitingRoomAction(profile, {
      invoke: () =>
        rejectParticipant(
          { id: jamPost.id, profileId: profile.id },
          occurrence ? { occurrence } : undefined,
        ),
      setBusy: setRejectingId,
      successKey: 'jams.waitingRoom.rejectSuccess',
      errorKey: 'jams.waitingRoom.rejectError',
    });

  const liftBan = async (profileId: string) => {
    setLiftingId(profileId);
    try {
      await liftJamBan({ id: jamPost.id, profileId });
      // Success is visible in the drawer itself (the row leaves the Removed
      // sublist), so no success toast — the error path is the one with no
      // other feedback.
    } catch {
      onLiftError?.(
        t('jams.people.unbanError', {
          defaultValue: 'Failed to re-allow profile',
        }),
      );
    } finally {
      setLiftingId(null);
    }
  };

  return {
    isModerator,
    hasWaitingRoom,
    moderatorIds: jam.moderators,
    bannedIds,
    liftingId,
    raisedHands,
    query,
    setQuery,
    listedParticipants,
    waitingProfiles,
    waitingRoomError,
    admittingId,
    rejectingId,
    admit,
    reject,
    liftBan,
  };
};
