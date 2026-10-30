import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { checkRoleCapabilities } from '@openpeepshq/common';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import {
  useSetPageHeader,
  useSetPlusButtonActions,
} from '../../components/layout';
import { EmptyStateContainer } from '../../components/custom/index';
import { GroupCard } from '../../components/groups/index';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../components/navigation/types/index';
import { Input } from '../../components/ui/input';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';

type GroupsTab = 'mine' | 'all';

type GroupsProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Groups'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const GroupsIndex: React.FC<GroupsProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const { data: groups, refetch, isLoading } = openpeepsApi.useGroups();
  const unseenCountsQuery = openpeepsApi.useUnseenPostCounts();
  const unseenByGroup = unseenCountsQuery.data?.groups ?? {};

  const [tab, setTab] = useState<GroupsTab>('mine');
  const [search, setSearch] = useState('');

  const isMember = useCallback(
    (groupId: string) =>
      currentProfile?.memberships?.some((m) => m.group.id === groupId) || false,
    [currentProfile]
  );

  const visibleGroups = useMemo(
    () =>
      (groups ?? [])
        .filter((g) => (tab === 'mine' ? isMember(g.id) : true))
        .filter((g) =>
          search
            ? g.displayName?.toLowerCase().includes(search.toLowerCase())
            : true
        ),
    [groups, isMember, search, tab]
  );

  const canCreate = checkRoleCapabilities(currentProfile?.roles ?? [], [
    'core-groups-create',
  ]).success;

  useSetPageHeader(t('navigation.groups', { defaultValue: 'Groups' }));
  useSetPlusButtonActions(
    canCreate
      ? {
          title: t('groups.new'),
          action: () => navigation.navigate('CreateGroup'),
        }
      : undefined
  );

  return (
    <ThemedView className="flex-1">
      <View
        accessibilityRole="tablist"
        className="border-border mb-4 flex-row border-b px-4"
      >
        <TabButton active={tab === 'mine'} onPress={() => setTab('mine')}>
          {t('groups.tabs.myGroups', { defaultValue: 'My groups' })}
        </TabButton>
        <TabButton active={tab === 'all'} onPress={() => setTab('all')}>
          {t('groups.tabs.allGroups', { defaultValue: 'All groups' })}
        </TabButton>
      </View>
      <View className="px-4">
        <Input
          placeholder={t('groups.searchPlaceholder', {
            defaultValue: 'Search by group name',
          })}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerClassName="grow"
        className="relative flex w-full bg-background px-4 pt-2"
      >
        {isLoading && <ActivityIndicator size="small" />}
        {!isLoading && visibleGroups.length === 0 && (
          <EmptyStateContainer
            type="groups"
            copyKey={
              !search && tab === 'mine'
                ? 'groups.noGroupsYet'
                : 'groups.noGroupsFound'
            }
          />
        )}
        {!isLoading &&
          visibleGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isGroupMember={isMember(group.id)}
              unreadCount={
                tab === 'mine' && isMember(group.id)
                  ? (unseenByGroup[group.id] ?? 0)
                  : 0
              }
              handleViewGroup={() =>
                navigation.navigate('Group', { id: group.id })
              }
            />
          ))}
        <View className="mb-24" />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};

const TabButton = ({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <Pressable
    accessibilityRole="tab"
    onPress={onPress}
    className={`px-4 py-2 ${active ? 'border-primary border-b-2' : ''}`}
  >
    <ThemedText
      className={`text-sm ${active ? 'font-semibold' : 'text-muted-foreground'}`}
    >
      {children}
    </ThemedText>
  </Pressable>
);
