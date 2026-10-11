import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps } from '@openpeepshq/react';
import { AgendaTabs } from '../../components/custom/index';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { EventsView, Feed } from '../../components/post/index';

type Tab = 'upcoming' | 'current' | 'past';

export const EventsMy: React.FC<MainScreenProps<'MyEvents'>> = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const [tab, setTab] = React.useState<Tab>('upcoming');

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
    <ThemedView className="flex-1">
      <AgendaTabs<Tab>
        accessibilityLabel={t('events.feed.label', {
          defaultValue: 'Event timeframe',
        })}
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'upcoming',
            label: t('events.feed.upcoming', { defaultValue: 'Upcoming' }),
          },
          {
            value: 'current',
            label: t('events.feed.current', { defaultValue: 'Now' }),
          },
          {
            value: 'past',
            label: t('events.feed.past', { defaultValue: 'Past' }),
          },
        ]}
      />
      <EventsView
        query={activeQuery}
        agenda={tab}
        list={<Feed query={activeQuery} formatSwitch={false} />}
      />
    </ThemedView>
  );
};
