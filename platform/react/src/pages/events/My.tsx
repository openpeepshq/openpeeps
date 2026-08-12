import { useState } from 'react';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Feed } from '../../components';

export function EventsMy() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [tab, setTab] = useState<'upcoming' | 'current' | 'past'>('upcoming');

  const upcomingQuery = openpeepsApi.useMyUpcomingEventsFeed();
  const currentQuery = openpeepsApi.useMyCurrentEventsFeed();
  const pastQuery = openpeepsApi.useMyPastEventsFeed();

  const activeQuery =
    tab === 'upcoming'
      ? upcomingQuery
      : tab === 'current'
        ? currentQuery
        : pastQuery;

  useSetPageHeader(t('navigation.myEvents', { defaultValue: 'My events' }));

  return (
    <div>
      <nav
        aria-label={t('events.feed.label', {
          defaultValue: 'Event timeframe',
        })}
        className="border-border flex border-b"
      >
        <TabButton
          active={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
        >
          {t('events.feed.upcoming', { defaultValue: 'Upcoming' })}
        </TabButton>
        <TabButton active={tab === 'current'} onClick={() => setTab('current')}>
          {t('events.feed.current', { defaultValue: 'Now' })}
        </TabButton>
        <TabButton active={tab === 'past'} onClick={() => setTab('past')}>
          {t('events.feed.past', { defaultValue: 'Past' })}
        </TabButton>
      </nav>
      <Feed query={activeQuery} />
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
