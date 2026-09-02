import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MoreHorizontal, PhoneCall } from 'lucide-react';
import {
  useT,
  useOpenpeeps,
  useSetPlusButtonActions,
  useSetPageHeader,
} from '../../index';
import {
  EventsFeed,
  LiveJamsSection,
  useCreateNewJam,
  useServerInfo,
} from '../../components';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';

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
      icon: PhoneCall,
      action: () => openCreateJam(),
    };
  }, [serverInfo.jams.livekit.enabled, t, openCreateJam]);
  useSetPlusButtonActions(plusButton);

  const headerActions = useMemo(() => {
    if (my) {
      return (
        <Link to="/jams" className="text-primary text-sm hover:underline">
          {t('navigation.jams', { defaultValue: 'All jams' })}
        </Link>
      );
    }
    return (
      <PopupMenu icon={MoreHorizontal} compact>
        <PopupMenuButton
          icon={ChevronRight}
          title={t('navigation.myJams', { defaultValue: 'My jams' })}
          text={t('navigation.myJams', { defaultValue: 'My jams' })}
          action="/jams/my"
        />
      </PopupMenu>
    );
  }, [my, t]);

  useSetPageHeader(
    my
      ? t('navigation.myJams', { defaultValue: 'My jams' })
      : t('navigation.jams', { defaultValue: 'Jams' }),
    headerActions,
    'jams-page-heading',
  );

  const upcoming = my
    ? openpeepsApi.useMyUpcomingJamsFeed()
    : openpeepsApi.useUpcomingJamsFeed();
  const past = my
    ? openpeepsApi.useMyPastJamsFeed()
    : openpeepsApi.usePastJamsFeed();

  const activeQuery = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-4">
      {!serverInfo.jams.livekit.enabled ? (
        <p role="status" className="text-destructive mb-4 text-sm">
          {t('jams.unavailable.message', {
            defaultValue:
              'Jams are unavailable because LiveKit is not connected.',
          })}
        </p>
      ) : null}
      {!my && serverInfo.jams.livekit.enabled ? <LiveJamsSection /> : null}

      <nav
        aria-label={t('jams.feed.label', { defaultValue: 'Jam timeframe' })}
        className="border-border mb-4 flex border-b"
      >
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
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
