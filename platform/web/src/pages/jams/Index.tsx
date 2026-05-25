import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MessageSquarePlus, MoreHorizontal } from 'lucide-react';
import { useT, useOpenpeeps, useSetPlusButtonActions } from '@openpeeps/react';
import {
  EventsFeed,
  LiveJamsSection,
  useCreateNewJam,
  useServerInfo,
} from '@openpeeps/react/components';
import { PopupMenu, PopupMenuButton } from '@openpeeps/react-ui';

interface Props {
  /** When true, scope to the current user's jams (`/jams/my`). */
  my?: boolean;
}

export function JamsIndex({ my = false }: Props) {
  const t = useT();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const { openCreateJam } = useCreateNewJam();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const plusButton = useMemo(() => {
    if (!serverInfo.jams.livekit.enabled) return undefined;
    return {
      title: t('jams.create.title', { defaultValue: 'Start a jam' }),
      icon: MessageSquarePlus,
      action: () => openCreateJam(),
    };
  }, [serverInfo.jams.livekit.enabled, t, openCreateJam]);
  useSetPlusButtonActions(plusButton);

  const upcoming = my
    ? openpeepsApi.useMyUpcomingJamsFeed()
    : openpeepsApi.useUpcomingJamsFeed();
  const past = my
    ? openpeepsApi.useMyPastJamsFeed()
    : openpeepsApi.usePastJamsFeed();

  const activeQuery = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold" data-testid="jams-page-heading">
          {my
            ? t('navigation.myJams', { defaultValue: 'My jams' })
            : t('navigation.jams', { defaultValue: 'Jams' })}
        </h1>
        {!my ? (
          <PopupMenu icon={MoreHorizontal} compact>
            <PopupMenuButton
              icon={ChevronRight}
              title={t('navigation.myJams', { defaultValue: 'My jams' })}
              text={t('navigation.myJams', { defaultValue: 'My jams' })}
              action="/jams/my"
            />
          </PopupMenu>
        ) : (
          <Link to="/jams" className="text-sm text-primary hover:underline">
            {t('navigation.jams', { defaultValue: 'All jams' })}
          </Link>
        )}
      </div>

      {!my && serverInfo.jams.livekit.enabled ? <LiveJamsSection /> : null}

      <nav className="mb-4 flex border-b border-border">
        <TabButton
          active={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
        >
          {t('jams.feed.upcoming', { defaultValue: 'Upcoming' })}
        </TabButton>
        <TabButton active={tab === 'past'} onClick={() => setTab('past')}>
          {t('jams.feed.past', { defaultValue: 'Past' })}
        </TabButton>
      </nav>
      <EventsFeed query={activeQuery} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
