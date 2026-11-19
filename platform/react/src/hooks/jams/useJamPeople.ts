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

export type UseJamPeopleArgs = {
  room: Room;
  participants: Participant[];
};

/**
 * People drawer data: searchable in-jam list sorted by raised hand (observers
 * hidden) and, for moderators, the waiting-room profiles with admit.
 */
export const useJamPeople = ({ room, participants }: UseJamPeopleArgs) => {
  const me = useCurrentProfile();
  const { jamPost, jam, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const raisedHands = useRaisedHands(room);

  const isModerator = !!me && jam.moderators.includes(me.id);
  const hasWaitingRoom = !!jam.waitingRoom;

  const waitingRoom = openpeepsApi.useWaitingRoomStream(
    isModerator && hasWaitingRoom ? jamPost.id : '',
    occurrence,
  );
  const admitParticipant = openpeepsApi.admitParticipantAction();
  const liftJamBan = openpeepsApi.liftJamBanAction();

  const [query, setQuery] = useState('');
  const [admittingId, setAdmittingId] = useState<string | null>(null);
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
    return sortByRaisedHand(visible, (participant) => participant.metadata);
    // raisedHands changes participant metadata order; re-sort when it updates.
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

  const admit = async (profile: Pick<PublicProfile, 'id'>) => {
    setAdmittingId(profile.id);
    try {
      await admitParticipant(
        { id: jamPost.id, profileId: profile.id },
        occurrence ? { occurrence } : undefined,
      );
    } finally {
      setAdmittingId(null);
    }
  };

  const liftBan = async (profileId: string) => {
    setLiftingId(profileId);
    try {
      await liftJamBan({ id: jamPost.id, profileId });
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
    admittingId,
    admit,
    liftBan,
  };
};
