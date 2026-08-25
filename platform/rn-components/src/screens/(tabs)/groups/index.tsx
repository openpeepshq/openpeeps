import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  CheckIcon,
  MoreVerticalIcon,
  SearchIcon,
  XIcon,
} from '~/components/icons';
import {
  EmptyStateContainer,
  GroupCard,
  TabScreensHeader,
} from '~/components/custom';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { Input } from '~/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';

type GroupsProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Groups'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Groups: React.FC<GroupsProps> = ({ navigation }) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: groups, refetch, isLoading } = openpeepsApi.useGroups();
  const unseenCountsQuery = openpeepsApi.useUnseenPostCounts();
  const unseenByGroup = unseenCountsQuery.data?.groups ?? {};

  const [filterBy, setFilterBy] = useState<'all-groups' | 'my-groups'>(
    'all-groups',
  );
  const [isSearchToggled, setIsSearchToggled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isMember = useCallback(
    (groupId: string) =>
      currentProfile?.memberships?.some(m => m.group.id === groupId) || false,
    [currentProfile],
  );

  const visibleGroups = useMemo(() =>
    (groups ?? [])
      .filter(g =>
        searchQuery ? g.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) : true,
      )
      .filter(g => filterBy === 'my-groups' ? isMember(g.id) : true),
    [groups, searchQuery, filterBy, isMember],
  );

  return (
    <ThemedView className="flex-1">
      <TabScreensHeader
        children={
          <View className="flex-row items-center justify-between p-4">
            {!isSearchToggled && (
              <ThemedText className="text-2xl font-semibold">Groups</ThemedText>
            )}
            <View
              className={
                isSearchToggled
                  ? 'flex justify-end'
                  : 'flex-row items-center gap-x-6'
              }>
              {isSearchToggled ? (
                <View className="ml-4 w-full flex-row justify-end">
                  <Input
                    className="flex-1"
                    placeholder="Enter Group Name"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <TouchableOpacity
                    className="items-center justify-center px-4"
                    onPress={() => {
                      setSearchQuery('');
                      setIsSearchToggled(false);
                    }}>
                    <XIcon size={24} className="text-foreground" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setIsSearchToggled(true)}>
                    <SearchIcon size={24} className="text-foreground" />
                  </TouchableOpacity>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <MoreVerticalIcon className="text-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mt-1">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          className="flex-row gap-x-2 items-center"
                          onPress={() => setFilterBy('all-groups')}>
                          <ThemedText>All Groups</ThemedText>
                          {filterBy === 'all-groups' && (
                            <CheckIcon size={12} className="text-foreground" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex-row gap-x-2 items-center"
                          onPress={() => setFilterBy('my-groups')}>
                          <ThemedText>My Groups</ThemedText>
                          {filterBy === 'my-groups' && (
                            <CheckIcon size={12} className="text-foreground" />
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </View>
          </View>
        }
      />
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative pt-2 px-4">
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && visibleGroups.length === 0 && (
          <EmptyStateContainer
            type="groups"
            inviteLabel="Ask PeePs"
            onInvite={() => navigation.navigate('Messages')}
          />
        )}
        {!isLoading &&
          visibleGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              isGroupMember={isMember(group.id)}
              unreadCount={isMember(group.id) ? unseenByGroup[group.id] ?? 0 : 0}
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
