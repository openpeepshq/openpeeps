import { useMemo, useState } from 'react';
import {
  AudioLines,
  Hand,
  Mic,
  MicOff,
  Search,
  UserRoundCheck,
  X,
} from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { matchesQuery, profileName } from '@openpeeps/common/lib';
import { useParticipants, useRoomContext } from '@livekit/components-react';
import { Button, Input } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar } from '../profile';
import { useJamContext } from './JamContext';
import { parseParticipantMetadata } from './jamEventActions';
import { useRaisedHands } from './useJamHands';

export interface JamPeopleDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * In-room participants list with mic / raised-hand / moderator indicators, plus
 * a moderator-only waiting-room admit section. Mirrors the Svelte
 * `PeopleDrawer` (which folds in `JamWaitingCard`).
 */
export function JamPeopleDrawer({ open, onClose }: JamPeopleDrawerProps) {
  const t = useT();
  const room = useRoomContext();
  const me = useCurrentProfile();
  const { jamPost, jam } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const participants = useParticipants();
  const raisedHands = useRaisedHands(room);

  const isModerator = !!me && jam.moderators.includes(me.id);
  const hasWaitingRoom = !!jam.waitingRoom;

  const waitingRoom = openpeepsApi.useWaitingRoomStream(jamPost.id);
  const admitParticipant = openpeepsApi.admitParticipantAction();

  const [query, setQuery] = useState('');
  const [admittingId, setAdmittingId] = useState<string | null>(null);

  const listedParticipants = useMemo(
    () =>
      participants.filter((participant) => {
        const metadata = parseParticipantMetadata(participant.metadata);
        if (metadata.observer) return false;
        return !query || matchesQuery(metadata.profile, query);
      }),
    [participants, query],
  );

  const waitingProfiles = useMemo(() => {
    if (!waitingRoom) return [] as PublicProfile[];
    return Object.values(waitingRoom).filter(
      (profile): profile is PublicProfile =>
        !!profile &&
        typeof profile === 'object' &&
        'id' in profile &&
        (!query || matchesQuery(profile, query)),
    );
  }, [waitingRoom, query]);

  if (!open) return null;

  const admit = async (profile: PublicProfile) => {
    setAdmittingId(profile.id);
    try {
      await admitParticipant({ id: jamPost.id, profileId: profile.id });
    } finally {
      setAdmittingId(null);
    }
  };

  return (
    <div className="bg-surface-100 text-foreground absolute right-0 top-0 flex h-full w-full flex-col gap-3 overflow-hidden rounded md:relative md:w-80">
      <div className="flex w-full flex-none items-center justify-between border-b p-2">
        <h3 className="text-lg">
          {t('jams.drawer.peopleTitle', { defaultValue: 'People' })}
        </h3>
        <button
          type="button"
          title={t('jams.drawer.close', { defaultValue: 'Close' })}
          className="text-neutral-400"
          onClick={onClose}
        >
          <X />
        </button>
      </div>

      <div className="px-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('jams.drawer.searchPeoplePlaceholder', {
              defaultValue: 'Search for people',
            })}
          />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        <div>
          <h4 className="text-muted-foreground text-xs font-semibold uppercase">
            {t('jams.people.inJam', { defaultValue: 'In jam' })}
          </h4>
          <div className="mt-1 flex flex-col gap-2">
            {listedParticipants.map((participant) => {
              const profile = parseParticipantMetadata(
                participant.metadata,
              ).profile;
              const handUp = raisedHands.has(participant.identity);
              const micOn = participant.isMicrophoneEnabled;
              const speaking = participant.isSpeaking;
              return (
                <div
                  key={participant.identity}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar profile={profile} size={2} />
                    <span className="truncate text-sm">
                      {(jam.moderators.includes(participant.identity)
                        ? '* '
                        : '') +
                        (profile ? profileName(profile) : participant.identity)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {handUp ? <Hand className="size-4" /> : null}
                    {!micOn ? (
                      <MicOff className="text-muted-foreground size-4" />
                    ) : speaking ? (
                      <AudioLines className="text-primary size-4" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </div>
                </div>
              );
            })}
            {listedParticipants.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                {t('jams.people.noParticipants', {
                  defaultValue: 'No participants found',
                })}
              </p>
            ) : null}
          </div>
        </div>

        {isModerator && hasWaitingRoom && waitingProfiles.length > 0 ? (
          <div>
            <h4 className="text-muted-foreground text-xs font-semibold uppercase">
              {t('jams.people.inWaitingRoom', {
                defaultValue: 'In waiting room',
              })}
            </h4>
            <div className="mt-1 flex flex-col gap-2">
              {waitingProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar profile={profile} size={2} />
                    <span className="truncate text-sm">
                      {profileName(profile)}
                    </span>
                  </div>
                  <Button
                    variant="variant-ringed-surface"
                    compact
                    action={() => admit(profile)}
                    disabled={admittingId === profile.id}
                    title={t('jams.waitingRoom.admitParticipant', {
                      defaultValue: 'Admit',
                    })}
                  >
                    <UserRoundCheck className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
