import { useMemo, useState } from 'react';
import type { Participant, Room } from 'livekit-client';
import type {
  JamWaitingProfile,
  PublicProfile,
} from '@openpeepshq/common/types';
import { matchesQuery, sortByRaisedHand } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useJamContext } from '../../components/jams/JamContext';
import { parseParticipantMetadata } from '../../components/jams/jamEventActions';
import { useRaisedHands } from '../../components/jams/useJamHands';
import { useT } from '../../i18n';

export type UseJamPeopleArgs = {
  room: Room;
  participants: Participant[];
  /** Toast feedback for admit/reject outcomes; the caller owns the toast UI. */
  onActionSuccess?: (message: string) => void;
  onActionError?: (message: string) => void;
};

/**
 * People drawer data: searchable in-jam list sorted by raised hand (observers
 * hidden) and, for moderators, the waiting-room profiles with admit and reject.
 */
export const useJamPeople = ({
  room,
  participants,
  onActionSuccess,
  onActionError,
}: UseJamPeopleArgs) => {
  const me = useCurrentProfile();
  const { jamPost, jam, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const raisedHands = useRaisedHands(room);
  const t = useT();

  const isModerator = !!me && jam.moderators.includes(me.id);
  const hasWaitingRoom = !!jam.waitingRoom;

  const waitingRoom = openpeepsApi.useWaitingRoomStream(
    isModerator && hasWaitingRoom ? jamPost.id : '',
    occurrence,
  );
  const admitParticipant = openpeepsApi.admitParticipantAction();
  const rejectParticipant = openpeepsApi.rejectParticipantAction();

  const [query, setQuery] = useState('');
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const listedParticipants = useMemo(() => {
    const visible = participants.filter((participant) => {
      const metadata = parseParticipantMetadata(participant.metadata);
      if (metadata.observer) return false;
      return !query || matchesQuery(metadata.profile, query);
    });
    // `raisedHands` is a reactivity dependency, not read here: the sort reads
    // hand state from participant metadata, so listing it re-sorts when hands
    // change.
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

  return {
    isModerator,
    hasWaitingRoom,
    moderatorIds: jam.moderators,
    raisedHands,
    query,
    setQuery,
    listedParticipants,
    waitingProfiles,
    admittingId,
    rejectingId,
    admit,
    reject,
  };
};
