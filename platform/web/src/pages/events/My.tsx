import { useState } from 'react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Feed } from '@openpeeps/react/components';

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

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {t('navigation.myEvents', { defaultValue: 'My events' })}
      </h1>
      <nav className="mb-4 flex border-b border-border">
        <TabButton
          active={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
        >
          {t('events.feed.upcoming', { defaultValue: 'Upcoming' })}
        </TabButton>
        <TabButton
          active={tab === 'current'}
          onClick={() => setTab('current')}
        >
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
      className={`px-4 py-2 text-sm ${active ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
