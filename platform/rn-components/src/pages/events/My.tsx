import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps } from '@openpeepshq/react';
import { AgendaTabs, GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { EventsView, Feed } from '~/components/post';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

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

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('navigation.myEvents', { defaultValue: 'My events' })}
      />
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
    </ThemedSafeAreaView>
  );
};
