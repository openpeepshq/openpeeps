import React, { useCallback, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { XIcon, SearchIcon, MessageSquareTextIcon } from '~/components/icons';
import { CompositeScreenProps } from '@react-navigation/native';
import {
  EmptyStateContainer,
  FeedPost,
  FollowUnfollowButton,
  GroupCard,
  InfiniteScrollContainer,
  ProfileCard,
  TabScreensHeader,
} from '~/components/custom';
import { ThemedText } from '~/components/ui/themed-text';
import { useTranslation } from 'react-i18next';
import { Pressable, TouchableOpacity, View, ScrollView } from 'react-native';
import { Input } from '~/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { ThemedView } from '~/components/ui/themed-view';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { CardEvent } from '~/components/custom/post/types/event/CardEvent';

type ExploreScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Explore'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Explore: React.FC<ExploreScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchToggled, setIsSearchToggled] = useState(false);
  const [tabValue, setTabValue] = useState('landing');
  const { clearMembers, setContt, setMember } = useNewConversationStore();

  const searchEventQuery = openpeepsApi.useSearchEvents(searchQuery);
  const searchGroupsQuery = openpeepsApi.useSearchGroups(searchQuery);
  const searchJamsQuery = openpeepsApi.useSearchJams(searchQuery);
  const searchPostsQuery = openpeepsApi.useSearchPosts(searchQuery);
  const searchProfilesQuery = openpeepsApi.useSearchProfiles(searchQuery);

  const isMember = useCallback(
    (groupId: string) =>
      currentProfile?.memberships?.some(m => m.group.id === groupId) || false,
    [currentProfile],
  );

  return (
    <ThemedView style={{ flexGrow: 1 }}>
      <Tabs
        value={tabValue}
        onValueChange={setTabValue}
        className="w-full mx-auto flex-col gap-1.5">
        <TabScreensHeader
          children={
            <View className="flex-row items-center justify-between p-2">
              {!isSearchToggled && (
                <ThemedText className="text-2xl font-semibold">
                  {t('navigation.explore')}
                </ThemedText>
              )}
              <View
                className={`${isSearchToggled
                  ? 'flex justify-end '
                  : 'flex-row items-center gap-x-6'
                  }`}>
                {isSearchToggled ? (
                  <>
                    <View className=" w-full flex-row flex justify-end">
                      <Input
                        className="flex-1"
                        placeholder="Search for members, posts, groups, jams, events"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      <TouchableOpacity
                        className="items-center justify-center px-4"
                        onPress={() => {
                          setSearchQuery('');
                          setIsSearchToggled(false);
                          setTabValue('landing');
                        }}>
                        <XIcon size={24} className="text-foreground" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}>
                      <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0">
                        <TabsTrigger
                          value="landing"
                          className={'hidden'}
                          onPress={() => {
                            setTabValue('hidden');
                          }}
                        />
                        <TabsTrigger
                          value="members"
                          className={`${tabValue === 'members'
                            ? 'border-b-2 border-foreground'
                            : ''
                            }`}
                          onPress={() => {
                            setTabValue('members');
                          }}>
                          <ThemedText>Members</ThemedText>
                        </TabsTrigger>
                        <TabsTrigger
                          value="posts"
                          className={`${tabValue === 'posts'
                            ? 'border-b-2 border-foreground'
                            : ''
                            }`}
                          onPress={() => {
                            setTabValue('posts');
                          }}>
                          <ThemedText>Posts</ThemedText>
                        </TabsTrigger>
                        <TabsTrigger
                          value="jams"
                          className={`${tabValue === 'jams'
                            ? 'border-b-2 border-foreground'
                            : ''
                            }`}
                          onPress={() => {
                            setTabValue('jams');
                          }}>
                          <ThemedText>Jams</ThemedText>
                        </TabsTrigger>
                        <TabsTrigger
                          value="events"
                          className={`${tabValue === 'events'
                            ? 'border-b-2 border-foreground'
                            : ''
                            }`}
                          onPress={() => {
                            setTabValue('events');
                          }}>
                          <ThemedText>Events</ThemedText>
                        </TabsTrigger>
                        <TabsTrigger
                          value="groups"
                          className={`${tabValue === 'groups'
                            ? 'border-b-2 border-foreground'
                            : ''
                            }`}
                          onPress={() => {
                            setTabValue('groups');
                          }}>
                          <ThemedText>Groups</ThemedText>
                        </TabsTrigger>
                      </TabsList>
                    </ScrollView>
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setIsSearchToggled(true)}>
                      <SearchIcon size={20} className="text-foreground" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          }
        />
        <TabsContent
          value="landing"
          className="w-full flex h-64 items-center justify-center">
          <SearchIcon size={64} className="text-foreground" />
          {searchQuery !== '' ? (
            <ThemedText className=" mt-6">{t('explore.selectTab')}</ThemedText>
          ) : (
            <ThemedText className=" mt-6">
              {t('explore.enterSearchQuery')}
            </ThemedText>
          )}
        </TabsContent>
        <TabsContent value="members" className="w-full  p-0">
          {searchQuery !== '' && (
            <ThemedText className="text-muted-foreground my-2">
              Search for "{searchQuery}" in {tabValue}
            </ThemedText>
          )}

          <InfiniteScrollContainer
            query={searchProfilesQuery}
            renderItem={({ item }) => (
              <ProfileCard
                profile={item.data}
                rightComponent={
                  item.data?.id !== currentProfile?.id ? (
                    <View className="flex flex-row items-center gap-x-4">
                      <Pressable
                        onPress={() => {
                          clearMembers();
                          setContt('');
                          setMember(item.data);
                          navigation.navigate('DraftMessage');
                        }}>
                        <MessageSquareTextIcon className="size-10 text-foreground" />
                      </Pressable>
                      <FollowUnfollowButton
                        profile={item.data}
                        useDifferentVariant={true}
                      />
                    </View>
                  ) : null
                }
              />
            )}
            uniqueBy={item => String(item?.data?.id)}
            ListEmptyComponent={<EmptyStateContainer type="profiles" />}
          />
        </TabsContent>
        <TabsContent value="posts" className="w-full  p-0">
          {searchQuery !== '' && (
            <ThemedText className="text-muted-foreground my-2">
              Search for "{searchQuery}" in {tabValue}
            </ThemedText>
          )}
          <InfiniteScrollContainer
            query={searchPostsQuery}
            renderItem={({ item }) => (
              <FeedPost
                key={item.data.id}
                post={item.data}
              />
            )}
            uniqueBy={item => String(item?.data?.id)}
            ListEmptyComponent={<EmptyStateContainer type="posts" />}
          />
        </TabsContent>
        <TabsContent value="jams" className="w-full  p-2">
          {searchQuery !== '' && (
            <ThemedText className="text-muted-foreground my-2">
              Search for "{searchQuery}" in {tabValue}
            </ThemedText>
          )}
          <InfiniteScrollContainer
            query={searchJamsQuery}
            renderItem={({ item }) => (
              <CardEvent
                key={item.data.id}
                post={item.data}
              />
            )}
            uniqueBy={item => String(item?.data?.id)}
            ListEmptyComponent={<EmptyStateContainer type="my-jams" />}
          />
        </TabsContent>
        <TabsContent value="events" className="w-full  p-2">
          {searchQuery !== '' && (
            <ThemedText className="text-muted-foreground my-2">
              Search for "{searchQuery}" in {tabValue}
            </ThemedText>
          )}
          <InfiniteScrollContainer
            query={searchEventQuery}
            renderItem={({ item }) => (
              <CardEvent
                key={item.data.id}
                post={item.data}
              />
            )}
            uniqueBy={item => String(item?.data?.id)}
            ListEmptyComponent={<EmptyStateContainer type="events" />}
          />
        </TabsContent>
        <TabsContent value="groups" className="w-full  p-2">
          {searchQuery !== '' && (
            <ThemedText className="text-muted-foreground my-2">
              Search for "{searchQuery}" in {tabValue}
            </ThemedText>
          )}
          <InfiniteScrollContainer
            query={searchGroupsQuery}
            renderItem={({ item }) => (
              <GroupCard
                key={item?.data?.id}
                group={item.data}
                isGroupMember={isMember(item.data.id)}
                handleViewGroup={() =>
                  navigation.navigate('Group', { id: item.data.id })
                }
              />
            )}
            uniqueBy={item => String(item?.data?.id)}
            ListEmptyComponent={<EmptyStateContainer type="groups" />}
          />
        </TabsContent>
      </Tabs>
    </ThemedView>
  );
};
