import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { groupName } from '@openpeepshq/common/lib';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import { GroupFeed, GroupHeader } from '../../components/groups/index';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../components/navigation/types/index';
import {
  EventsFeed,
  NewEventButton,
  NewNoteButton,
} from '../../components/post/index';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { ThemedText } from '../../components/ui/themed-text';
import { truncateText } from '../../lib/utils';
import { GroupInfoAsComponent } from './Info';

type GroupProps = CompositeScreenProps<
  NativeStackScreenProps<MainStackParamList, 'Group'>,
  NativeStackScreenProps<TabStackParamList>
>;

type Tab = 'posts' | 'events' | 'description';

export const GroupShow = ({ route, navigation }: GroupProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const currentProfile = useCurrentProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { id, handle } = route.params;
  const [tab, setTab] = useState<Tab>('posts');
  const groupById = openpeepsApi.useGroup(id || '');
  const groupByHandle = openpeepsApi.useGroupByHandle(handle || '');

  const group = id ? groupById.data : groupByHandle.data;
  const isLoading = id ? groupById.isLoading : groupByHandle.isLoading;
  const refetchGroup = id ? groupById.refetch : groupByHandle.refetch;

  const upcomingEvents = openpeepsApi.useGroupUpcomingEventsFeed(
    group?.id ?? ''
  );

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

  const tabClass = (value: Tab) =>
    tab === value ? 'border-b-2 border-foreground' : '';

  return (
    <ThemedSafeAreaView className="relative flex-1">
      <GenericHeader title={truncateText(group ? groupName(group) : '', 30)} />
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
              onValueChange={(value) => setTab(value as Tab)}
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
                <EventsFeed query={upcomingEvents} />
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
    </ThemedSafeAreaView>
  );
};
