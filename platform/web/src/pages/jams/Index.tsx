import { useState } from 'react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { EventsFeed } from '@openpeeps/react/components';

interface Props {
  /** When true, scope to the current user's jams (`/jams/my`). */
  my?: boolean;
}

export function JamsIndex({ my = false }: Props) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcoming = my
    ? openpeepsApi.useMyUpcomingJamsFeed()
    : openpeepsApi.useUpcomingJamsFeed();
  const past = my
    ? openpeepsApi.useMyPastJamsFeed()
    : openpeepsApi.usePastJamsFeed();

  const activeQuery = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {my
          ? t('navigation.myJams', { defaultValue: 'My jams' })
          : t('navigation.jams', { defaultValue: 'Jams' })}
      </h1>
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
