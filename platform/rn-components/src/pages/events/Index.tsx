import React from 'react';
import { Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  useCurrentProfile,
  useDefaultVisibility,
  useOpenpeeps,
} from '@openpeepshq/react';
import { AgendaTabs } from '../../components/custom/index';
import { useSetPageHeader } from '../../components/layout';
import {
  ChevronRightIcon,
  MoreHorizontalIcon,
} from '../../components/icons/index';
import { MainStackParamList } from '../../components/navigation/types/index';
import {
  EventsFeed,
  EventsView,
  NewEventButton,
} from '../../components/post/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';

type Tab = 'upcoming' | 'past';

export const EventsIndex = ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'Events'>) => {
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>('upcoming');

  const upcomingQuery = openpeepsApi.useUpcomingEventsFeed();
  const pastQuery = openpeepsApi.usePastEventsFeed();
  const activeQuery = tab === 'upcoming' ? upcomingQuery : pastQuery;

  const visibility = useDefaultVisibility();

  useSetPageHeader(
    t('navigation.events', { defaultValue: 'Events' }),
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="px-2">
        <Pressable>
          <MoreHorizontalIcon className="text-foreground" />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mt-1">
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="flex-row items-center gap-x-2"
            onPress={() => navigation.navigate('MyEvents')}
          >
            <ChevronRightIcon size={16} className="text-foreground" />
            <ThemedText>
              {t('navigation.myEvents', { defaultValue: 'My events' })}
            </ThemedText>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ThemedView className="relative flex-1">
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
            value: 'past',
            label: t('events.feed.past', { defaultValue: 'Past' }),
          },
        ]}
      />
      <EventsView
        query={activeQuery}
        agenda={tab}
        list={<EventsFeed query={activeQuery} />}
      />
      <NewEventButton visibility={visibility} currentProfile={currentProfile} />
    </ThemedView>
  );
};
