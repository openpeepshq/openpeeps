import { useMemo, useState } from 'react';
import { ChevronDown, UserRoundCheck, Users } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { matchesQuery, profileName } from '@openpeeps/common/lib';
import { Button, Input } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar } from '../profile';
import { useJamContext } from './JamContext';

export function JamWaitingRoomPanel() {
  const t = useT();
  const me = useCurrentProfile();
  const { jamPost, jam } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const waitingRoom = openpeepsApi.useWaitingRoomStream(jamPost.id);
  const admitParticipant = openpeepsApi.admitParticipantAction();

  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [admittingId, setAdmittingId] = useState<string | null>(null);

  const isModerator = !!me && jam.moderators.includes(me.id);
  const hasWaitingRoom = !!jam.waitingRoom;

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

  if (!isModerator || !hasWaitingRoom) return null;

  const admit = async (profile: PublicProfile) => {
    setAdmittingId(profile.id);
    try {
      await admitParticipant({ id: jamPost.id, profileId: profile.id });
    } finally {
      setAdmittingId(null);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col">
      <div className="bg-card pointer-events-auto rounded-lg border shadow-lg">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex items-center gap-2 text-sm">
            <Users className="size-4" />
            {t('jams.people.inWaitingRoom', {
              defaultValue: 'Waiting room',
            })}
            {waitingProfiles.length ? (
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {waitingProfiles.length}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open ? (
          <div className="space-y-3 border-t px-4 py-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('jams.drawer.searchPeoplePlaceholder', {
                defaultValue: 'Search…',
              })}
            />
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {waitingProfiles.length ? (
                waitingProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar profile={profile} size={3} />
                      <span className="truncate text-sm">
                        {profileName(profile)}
                      </span>
                    </div>
                    <Button
                      variant="variant-ringed-surface"
                      action={() => admit(profile)}
                      disabled={admittingId === profile.id}
                      title={t('jams.waitingRoom.admitParticipant', {
                        defaultValue: 'Admit',
                      })}
                    >
                      <UserRoundCheck className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {t('jams.people.noParticipants', {
                    defaultValue: 'No one waiting',
                  })}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
