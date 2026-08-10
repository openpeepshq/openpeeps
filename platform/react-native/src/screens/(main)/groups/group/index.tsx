import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  Feed,
  GenericHeader,
  GroupHeader,
  GroupPageActions,
  NewEventButton,
  NewPostButton,
} from '~/components/custom';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { truncateText } from '~/lib/utils';
import { ThemedText } from '~/components/ui/themed-text';
import { UsersIcon } from '~/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GroupInfoAsComponent } from './info';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { EventsFeed } from '~/components/custom/post/feed/events/EventsFeed';
import { useTranslation } from 'react-i18next';

type GroupProps = CompositeScreenProps<
  NativeStackScreenProps<MainStackParamList, 'Group'>,
  NativeStackScreenProps<TabStackParamList>
>;

export const Group = ({ route, navigation }: GroupProps) => {
  const { openpeepsApi } = useOpenpeeps();
    const { t } = useTranslation();
  const { data: currentProfile } = openpeepsApi.useCurrentProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { id, handle } = route.params;
  const [tabValue, setTabValue] = useState('posts');
  const groupById = openpeepsApi.useGroup(id || "");
  const groupByHandle = openpeepsApi.useGroupByHandle(handle || "");

  const groupData = id ? groupById.data : groupByHandle.data;
  const isLoading = id ? groupById.isLoading : groupByHandle.isLoading;
  const refetchGroup = id ? groupById.refetch : groupByHandle.refetch;

  const postsQuery = openpeepsApi.usePostsByGroup(groupData?.id || "", { limit: 15 });
  const eventsQuery = openpeepsApi.useGroupUpcomingEventsFeed(groupData?.id || "");

  const {
    data: groupEventsData,
  } = openpeepsApi.useGroupUpcomingEventsFeed(groupData?.id || '');
  const events = useMemo(() => groupEventsData?.pages.flat() || [], [groupEventsData]);


  const handleCreatePost = () => {
    navigation.navigate('TabNavigator', {
      screen: 'NewPost',
      params: {
        originatorId: groupData?.id,
        triggeredFrom: 'group',
      },
    });
  };
  const handleGoToEvent = () => {
    navigation.navigate('NewEvent');
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        await Promise.all([refetchGroup()]);
      } catch (error) {
        console.error('Failed to refetch data:', error);
      }
    });

    return unsubscribe;
  }, [navigation, refetchGroup]);

  const onRefresh = () => {
    setIsRefreshing(true);
    refetchGroup();
    setIsRefreshing(false);
  };

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        title={truncateText(groupData?.displayName || 'Group', 30)}
      />
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative">
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && (
          <>
            <View className="w-full">
              <GroupHeader
                headerUri={groupData?.header!}
                avatarUri={groupData?.avatar!}
              />
              {groupData && (
                <GroupPageActions
                  navigation={navigation}
                  route={route}
                  groupData={groupData}
                  isGroupMember={
                    currentProfile?.memberships
                      ?.map(m => m.group.id)
                      .includes(groupData.id) || false
                  }
                />
              )}
              <View className="px-4 pt-2 w-full flex-1 gap-y-2 relative">
                <View className="mt-10">
                  <ThemedText className="text-lg font-semibold">
                    {groupData?.displayName || '-'}
                  </ThemedText>
                </View>
                <View className="mt-5 flex-row gap-x-4">
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('GroupMembers', {
                        id: groupData?.id as string,
                      })
                    }
                    className="flex-row gap-x-2 items-center p-2">
                    <UsersIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {groupData?.membersCount} Member
                      {groupData?.membersCount && groupData?.membersCount > 1
                        ? 's'
                        : ''}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Tabs
              value={tabValue}
              onValueChange={setTabValue}
              className="w-full mx-auto flex-col gap-1.5 mt-5">
              <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
                <TabsTrigger
                  value="posts"
                  className={`${tabValue === 'posts' ? 'border-b-2 border-foreground' : ''
                    }`}>
                  <ThemedText>{t('groups.sections.posts')}</ThemedText>
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  disabled={!events || events.length === 0}
                  style={!events || events.length === 0 ? {display: "none" } : {}}
                >
                  <ThemedText>{t('groups.sections.events')}</ThemedText>
                </TabsTrigger>
                <TabsTrigger
                  value="description"
                  className={`${tabValue === 'description'
                    ? 'border-b-2 border-foreground'
                    : ''
                    }`}
                  onPress={() => {
                    setTabValue('description');
                  }}>
                  <ThemedText>{t('groups.sections.description')}</ThemedText>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="p-0">
                <Feed
                  query={postsQuery}
                  pinnedPostId={groupData?.pinnedPostId}
                  inGroup
                  isPostFeed={false}
                />
              </TabsContent>
              <TabsContent value="events" className="p-2">
                <EventsFeed query={eventsQuery} />
              </TabsContent>
              <TabsContent value="description" className="p-2">
                <GroupInfoAsComponent id={groupData?.id as string} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </KeyboardAwareScrollView>
      {groupData?.id &&
      currentProfile?.memberships
        ?.map(m => m.group.id)
        .includes(groupData.id) &&
      tabValue === 'posts' ? (
        <NewPostButton onPress={handleCreatePost} />
      ) : groupData?.id &&
        currentProfile?.memberships
          ?.map(m => m.group.id)
          .includes(groupData.id) &&
        tabValue === 'events' ? (
        <>
          {currentProfile?.roles?.find(role => role.key === 'owner') && (
            <NewEventButton onPress={handleGoToEvent} />
          )}
        </>
      ) : null}
    </ThemedSafeAreaView>
  );
};
