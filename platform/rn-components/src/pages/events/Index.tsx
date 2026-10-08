import React from 'react';
import { Pressable, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  useCurrentProfile,
  useDefaultVisibility,
  useOpenpeeps,
} from '@openpeepshq/react';
import { AgendaTabs, TabScreensHeader } from '~/components/custom';
import { ChevronRightIcon, MoreHorizontalIcon } from '~/components/icons';
import { MainStackParamList } from '~/components/navigation/types';
import { EventsFeed, EventsView, NewEventButton } from '~/components/post';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';

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

  return (
    <ThemedView className="flex-1 relative">
      <TabScreensHeader
        children={
          <View className="w-full flex-row justify-between items-center p-4">
            <ThemedText className="text-2xl font-semibold">
              {t('navigation.events', { defaultValue: 'Events' })}
            </ThemedText>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="px-2">
                <Pressable>
                  <MoreHorizontalIcon className="text-foreground" />
                </Pressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-1">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="flex-row gap-x-2 items-center"
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
          </View>
        }
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
