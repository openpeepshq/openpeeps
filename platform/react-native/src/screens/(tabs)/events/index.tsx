import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../../components/navigation/types';
import { Pressable, View } from 'react-native';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedText } from '../../../components/ui/themed-text';
import { ThemedView } from '../../../components/ui/themed-view';
import {
  XIcon,
  SearchIcon,
  MoreVerticalIcon,
  CheckIcon,
} from '../../../components/icons';
import {
  TabScreensHeader,
  NewEventButton,
} from '../../../components/custom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { EventsFeed } from '../../../components/custom/post/feed/events';
import { checkRoleCapabilities } from '@openpeeps/common';

export const Events = ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'Events'>) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { t } = useTranslation();

  const upcomingEventsQuery = openpeepsApi.useUpcomingEventsFeed();
  const pastEventsQuery = openpeepsApi.usePastEventsFeed();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterBy, setFilterBy] = React.useState<
    'upcoming-events' | 'past-events'
  >('upcoming-events');

  const [isSearchButtonClicked, setIsSearchButtonClicked] =
    React.useState(false);

  return (
    <ThemedView className="flex-1 relative">
      <TabScreensHeader
        children={
          <>
            {!isSearchButtonClicked ? (
              <View className="w-full flex flex-row justify-between items-center p-4">
                <ThemedText className="text-2xl font-semibold">
                  {t('navigation.events')}
                </ThemedText>
                <View className="flex flex-row items-center gap-x-3">
                  <Pressable
                    onPress={() => setIsSearchButtonClicked(true)}
                    className="px-2">
                    <SearchIcon className="text-foreground" />
                  </Pressable>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="px-2">
                      <MoreVerticalIcon className="text-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className=" mt-1">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          className="flex-row gap-x-2 items-center"
                          onPress={() => {
                            setFilterBy('upcoming-events');
                          }}>
                          <ThemedText>Upcoming Events</ThemedText>
                          {filterBy === 'upcoming-events' && (
                            <CheckIcon size={12} className="text-foreground" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex-row gap-x-2 items-center"
                          onPress={() => {
                            setFilterBy('past-events');
                          }}>
                          <ThemedText>Past Events</ThemedText>
                          {filterBy === 'past-events' && (
                            <CheckIcon size={12} className="text-foreground" />
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>
              </View>
            ) : (
              <View className="w-full flex flex-row justify-between items-center p-4">
                <Input
                  className="flex-1"
                  placeholder="Enter name or description"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Pressable
                  className="w-[10%] flex justify-center items-center"
                  onPress={() => {
                    setIsSearchButtonClicked(false);
                    setSearchQuery('');
                  }}>
                  <XIcon className="text-foreground" />
                </Pressable>
              </View>
            )}
          </>
        }
      />

      <EventsFeed
        query={
          filterBy === 'upcoming-events'
            ? (upcomingEventsQuery)
            : (pastEventsQuery)
        }
        searchQuery={searchQuery}
      />
      {checkRoleCapabilities(['core-posts-create-event-local'], currentProfile?.roles).success && (
        <NewEventButton onPress={() => navigation.navigate('NewEvent')} />
      )}
    </ThemedView>
  );
};
