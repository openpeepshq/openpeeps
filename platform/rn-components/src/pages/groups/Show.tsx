import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  groupName,
  groupSectionFromHash,
  type GroupSection,
} from '@openpeepshq/common/lib';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { GroupFeed, GroupHeader } from '../../components/groups/index';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../components/navigation/types/index';
import {
  EventsFeed,
  NewEventButton,
  NewNoteButton,
  NewResourceButton,
} from '../../components/post/index';
import { ResourceLibrary } from '../../components/resources';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { ThemedText } from '../../components/ui/themed-text';
import { truncateText } from '../../lib/utils';
import { GroupInfoAsComponent } from './Info';

type GroupProps = CompositeScreenProps<
  NativeStackScreenProps<MainStackParamList, 'Group'>,
  NativeStackScreenProps<TabStackParamList>
>;

export const GroupShow = ({ route, navigation }: GroupProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const currentProfile = useCurrentProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { id, handle, tab: tabParam } = route.params;
  const [tab, setTab] = useState<GroupSection>(() =>
    groupSectionFromHash(tabParam ? `#${tabParam}` : '')
  );

  useEffect(() => {
    if (!tabParam) return;
    setTab(groupSectionFromHash(`#${tabParam}`));
  }, [tabParam]);
  const groupById = openpeepsApi.useGroup(id || '');
  const groupByHandle = openpeepsApi.useGroupByHandle(handle || '');

  const group = id ? groupById.data : groupByHandle.data;
  const isLoading = id ? groupById.isLoading : groupByHandle.isLoading;
  const refetchGroup = id ? groupById.refetch : groupByHandle.refetch;

  const upcomingEvents = openpeepsApi.useGroupUpcomingEventsFeed(
    group?.id ?? ''
  );
  const pastEvents = openpeepsApi.useGroupPastEventsFeed(group?.id ?? '');
  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(
    () =>
      navigation.addListener('focus', () => {
        void refetchGroup();
      }),
    [navigation, refetchGroup]
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refetchGroup();
    setIsRefreshing(false);
  };

  const tabClass = (value: GroupSection) =>
    tab === value ? 'border-b-2 border-primary font-semibold' : '';

  useSetPageHeader(truncateText(group ? groupName(group) : '', 30));

  return (
    <ThemedView className="relative flex-1">
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
          />
        }
        contentContainerClassName="grow"
        className="relative flex w-full bg-background"
      >
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : !group ? (
          <View className="flex-1 items-center justify-center p-8">
            <ThemedText className="text-2xl font-bold">
              {t('groups.notFound')}
            </ThemedText>
          </View>
        ) : (
          <>
            <GroupHeader group={group} />
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as GroupSection)}
              className="mx-auto w-full flex-col gap-1.5"
            >
              <TabsList className="w-full flex-row rounded-none border-b border-muted bg-transparent p-0 px-3">
                <TabsTrigger value="posts" className={tabClass('posts')}>
                  <ThemedText>{t('groups.sections.posts')}</ThemedText>
                </TabsTrigger>
                <TabsTrigger value="events" className={tabClass('events')}>
                  <ThemedText>{t('groups.sections.events')}</ThemedText>
                </TabsTrigger>
                <TabsTrigger
                  value="resources"
                  className={tabClass('resources')}
                >
                  <ThemedText>{t('groups.sections.resources')}</ThemedText>
                </TabsTrigger>
                <TabsTrigger
                  value="description"
                  className={tabClass('description')}
                >
                  <ThemedText>{t('groups.sections.description')}</ThemedText>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="p-0">
                <GroupFeed group={group} />
              </TabsContent>
              <TabsContent value="events" className="p-2">
                <View className="mb-2 flex-row border-b border-border">
                  <Pressable
                    className={`px-4 py-2 ${
                      eventsTab === 'upcoming'
                        ? 'border-b-2 border-primary'
                        : ''
                    }`}
                    onPress={() => setEventsTab('upcoming')}
                  >
                    <ThemedText
                      className={
                        eventsTab === 'upcoming' ? 'font-semibold' : ''
                      }
                    >
                      {t('events.feed.upcoming')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    className={`px-4 py-2 ${
                      eventsTab === 'past' ? 'border-b-2 border-primary' : ''
                    }`}
                    onPress={() => setEventsTab('past')}
                  >
                    <ThemedText
                      className={eventsTab === 'past' ? 'font-semibold' : ''}
                    >
                      {t('events.feed.past')}
                    </ThemedText>
                  </Pressable>
                </View>
                <EventsFeed
                  query={eventsTab === 'upcoming' ? upcomingEvents : pastEvents}
                />
              </TabsContent>
              <TabsContent value="resources" className="p-0">
                <ResourceLibrary groupId={group.id} />
              </TabsContent>
              <TabsContent value="description" className="p-2">
                <GroupInfoAsComponent id={group.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </KeyboardAwareScrollView>
      {group && tab === 'posts' ? (
        <NewNoteButton
          visibility="group"
          currentProfile={currentProfile}
          group={group}
        />
      ) : null}
      {group && tab === 'events' ? (
        <NewEventButton
          visibility="group"
          currentProfile={currentProfile}
          group={group}
        />
      ) : null}
      {group && tab === 'resources' ? (
        <NewResourceButton
          visibility="group"
          currentProfile={currentProfile}
          group={group}
        />
      ) : null}
    </ThemedView>
  );
};
