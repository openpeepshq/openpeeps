import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  EventsFeed,
  NewEventButton,
  useCurrentProfile,
  useDefaultVisibility,
} from '../../components';

export function EventsIndex() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingQuery = openpeepsApi.useUpcomingEventsFeed();
  const pastQuery = openpeepsApi.usePastEventsFeed();

  const activeQuery = tab === 'upcoming' ? upcomingQuery : pastQuery;

  useSetPageHeader(
    t('navigation.events', { defaultValue: 'Events' }),
    undefined,
    'events-page-heading',
  );

  return (
    <div className="p-4">
      <NewEventButton
        visibility={visibility}
        currentProfile={currentProfile}
        onNavigate={() => navigate('/events/new')}
        showButton={false}
      />
      <nav className="border-border mb-4 flex border-b">
        <TabButton
          active={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
        >
          {t('events.feed.upcoming', { defaultValue: 'Upcoming' })}
        </TabButton>
        <TabButton active={tab === 'past'} onClick={() => setTab('past')}>
          {t('events.feed.past', { defaultValue: 'Past' })}
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
