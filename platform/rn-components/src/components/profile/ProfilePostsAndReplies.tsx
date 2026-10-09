import React, { type ReactNode, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicProfile } from '@openpeepshq/common/types';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { GroupCard } from '../groups/GroupCard';
import { UsersIcon } from '../icons/index';
import { MainStackParamList } from '../navigation/types/index';
import { Feed } from '../post/Feed';
import { handleScroll } from '../../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ThemedText } from '../ui/themed-text';
import { ProfileActivitySummary } from './ProfileActivitySummary';

export interface ProfilePostsAndRepliesProps {
  profile: PublicProfile;
  isCurrentProfile?: boolean;
  /** Scrolls together with the feed so infinite loading keeps one scroll view. */
  header?: ReactNode;
}

type ProfileTab = 'posts' | 'activity' | 'groups';

export const ProfilePostsAndReplies = ({
  profile,
  isCurrentProfile = false,
  header,
}: ProfilePostsAndRepliesProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { openpeepsApi } = useOpenpeeps();
  const postsQuery = openpeepsApi.usePostsByProfile(
    profile.id,
    useFeedListParams({ limit: 15 })
  );
  const commonGroupsQuery = openpeepsApi.useCommonGroups(profile.id);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const activeTab = tab === 'activity' && !isCurrentProfile ? 'posts' : tab;

  const tabClass = (value: ProfileTab) =>
    `flex-1 ${activeTab === value ? 'border-b-2 border-primary' : ''}`;

  return (
    <ScrollView
      className="bg-background"
      onScroll={({ nativeEvent }) => handleScroll(nativeEvent, postsQuery)}
      scrollEventThrottle={16}
    >
      {header}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setTab(value as ProfileTab)}
        className="mx-auto w-full flex-col gap-1.5"
      >
        <TabsList
          accessibilityLabel={t('profile.tabs.label')}
          className="w-full flex-row rounded-none border-b border-muted bg-transparent p-0"
        >
          <TabsTrigger value="posts" className={tabClass('posts')}>
            <ThemedText>{t('profile.posts')}</ThemedText>
          </TabsTrigger>
          {isCurrentProfile ? (
            <TabsTrigger value="activity" className={tabClass('activity')}>
              <ThemedText>{t('profile.activity.tab')}</ThemedText>
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="groups" className={tabClass('groups')}>
            <ThemedText>{t('profile.groups.tabName')}</ThemedText>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="p-0">
          <Feed
            query={postsQuery}
            pinnedPostId={profile.pinnedPostId}
            isPostFeed={false}
          />
        </TabsContent>
        <TabsContent value="activity" className="p-0">
          <ProfileActivitySummary profile={profile} />
        </TabsContent>
        <TabsContent value="groups" className="p-4">
          {commonGroupsQuery.isLoading ? (
            <ActivityIndicator size="small" />
          ) : null}
          {(commonGroupsQuery.data ?? []).map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isGroupMember
              handleViewGroup={() =>
                navigation.navigate('Group', { handle: group.handle })
              }
            />
          ))}
          {!commonGroupsQuery.isLoading && !commonGroupsQuery.data?.length ? (
            <View className="h-[60vh] w-full flex-col items-center justify-center gap-y-6">
              <UsersIcon size={60} className="text-foreground" />
              <ThemedText>{t('profile.groups.noCommonGroups')}</ThemedText>
            </View>
          ) : null}
        </TabsContent>
      </Tabs>
    </ScrollView>
  );
};
