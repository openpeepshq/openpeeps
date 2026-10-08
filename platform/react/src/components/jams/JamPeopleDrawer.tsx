import {
  AudioLines,
  Hand,
  Mic,
  MicOff,
  Search,
  UserRoundCheck,
  WifiOff,
  X,
} from 'lucide-react';
import { profileName } from '@openpeepshq/common/lib';
import { useParticipants, useRoomContext } from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import { Button, Input } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useJamPeople } from '../../hooks/jams/useJamPeople';
import { Avatar } from '../profile';
import { parseParticipantMetadata } from './jamEventActions';
import { useConnectionLost } from './useParticipantConnection';

export interface JamPeopleDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** One "In jam" row. Split out so the connection-quality hook runs per participant. */
function JamParticipantRow({
  participant,
  handUp,
  isModerator,
}: {
  participant: Participant;
  handUp: boolean;
  isModerator: boolean;
}) {
  const t = useT();
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const micOn = participant.isMicrophoneEnabled;
  const speaking = participant.isSpeaking;
  const connectionLost = useConnectionLost(participant);

  return (
    <div className="flex items-center justify-between gap-2">
      <div
        className={`flex min-w-0 items-center gap-2 ${connectionLost ? 'opacity-50' : ''}`}
      >
        <Avatar profile={profile} size={2} />
        <span className="truncate text-sm">
          {(isModerator ? '* ' : '') +
            (profile ? profileName(profile) : participant.identity)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {handUp ? <Hand className="size-4" /> : null}
        {connectionLost ? (
          <span
            className="text-muted-foreground flex items-center gap-1 text-xs"
            title={t('jams.people.connectionLost', {
              defaultValue: 'Connection lost',
            })}
          >
            <WifiOff className="size-4" />
          </span>
        ) : !micOn ? (
          <MicOff className="text-muted-foreground size-4" />
        ) : speaking ? (
          <AudioLines className="text-primary size-4" />
        ) : (
          <Mic className="size-4" />
        )}
      </div>
    </div>
  );
}

/**
 * In-room participants list with mic / raised-hand / moderator indicators, plus
 * a moderator-only waiting-room admit section. Mirrors the Svelte
 * `PeopleDrawer` (which folds in `JamWaitingCard`).
 */
export function JamPeopleDrawer({ open, onClose }: JamPeopleDrawerProps) {
  const t = useT();
  const room = useRoomContext();
  const participants = useParticipants();
  const {
    isModerator,
    hasWaitingRoom,
    moderatorIds,
    raisedHands,
    query,
    setQuery,
    listedParticipants,
    waitingProfiles,
    admittingId,
    admit,
  } = useJamPeople({ room, participants });

  if (!open) return null;

  return (
    <div className="bg-surface text-foreground absolute right-0 top-0 z-30 flex h-full w-full flex-col gap-3 overflow-hidden rounded md:relative md:z-auto md:w-80">
      <div className="bg-surface relative z-20 flex w-full flex-none items-center justify-between gap-2 border-b pb-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))]">
        <h3 className="text-lg">
          {t('jams.drawer.peopleTitle', { defaultValue: 'People' })}
        </h3>
        <button
          type="button"
          title={t('jams.drawer.close', { defaultValue: 'Close' })}
          aria-label={t('jams.drawer.close', { defaultValue: 'Close' })}
          className="text-foreground flex size-10 shrink-0 items-center justify-center"
          onClick={onClose}
        >
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">
            {t('jams.drawer.close', { defaultValue: 'Close' })}
          </span>
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
            {listedParticipants.map((participant) => (
              <JamParticipantRow
                key={participant.identity}
                participant={participant}
                handUp={raisedHands.has(participant.identity)}
                isModerator={moderatorIds.includes(participant.identity)}
              />
            ))}
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
                    variant="outline"
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
