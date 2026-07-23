import { Pressable, View } from 'react-native';
import React from 'react';
import {
  checkGroupCapabilities,
  GroupWithMeta,
  PublicProfile,
} from '@openpeeps/common';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { ThemedText } from '~/components/ui/themed-text';
import { truncateText } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { useOpenpeeps } from '@openpeeps/react';
import Toast from 'react-native-toast-message';
import {UsersIcon} from '~/components/icons';

interface GroupCardProps {
  group: GroupWithMeta;
  isGroupMember: boolean;
  handleViewGroup: () => void;
  unreadCount?: number;
}

export const GroupCard = ({
  group,
  isGroupMember = false,
  handleViewGroup,
  unreadCount = 0,
}: GroupCardProps) => {
  const { openpeepsApi, currentProfile, queryClient } = useOpenpeeps();
  const [isLoading, setIsLoading] = React.useState(false);

  const joinGroup = openpeepsApi.addGroupMemberAction({ id: group.id });

  const canJoin = checkGroupCapabilities(
    { profile: currentProfile, scopes: [] },
    ['core-groups-join'],
    group,
  ).success;

  const handleJoinGroup = async () => {
    setIsLoading(true);
    joinGroup({
      ...(currentProfile as PublicProfile),
    })
      .then(async () => {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `You have joined ${group.displayName}`,
        });
        await queryClient.invalidateQueries();
        handleViewGroup();
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: `Failed to join ${group.displayName}`,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <View className="flex flex-row justify-between w-full mb-8">
      <Pressable
        onPress={handleViewGroup}
        className='className="flex flex-row items-center gap-x-2"'>
        <Avatar alt="profile" className="size-16">
          {group?.avatar ? (
            <AvatarImage
              source={{
                uri: group?.avatar,
              }}
            />
          ) : (
            <AvatarFallback>
              <UsersIcon size={20} className='text-foreground'/>
            </AvatarFallback>
          )}
        </Avatar>
        <View className="ml-2">
          <View className="flex-row items-center gap-x-2">
            <ThemedText className="text-lg font-semibold">
              {truncateText(group.displayName, 25) || '-'}
            </ThemedText>
            {unreadCount > 0 ? (
              <View className="bg-destructive size-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1">
                <ThemedText className="text-xs font-semibold text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <View className="flex-row gap-x-3 mt-2 items-center">
            <ThemedText className="text-sm">
              {group?.membersCount} Member
              {group?.membersCount && group?.membersCount > 1 ? 's' : ''}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      {!isGroupMember ? (
        !canJoin ? (
          <Button variant="outline" disabled>
            <ThemedText>Locked</ThemedText>
          </Button>
        ) : (
          <Button
            variant={'outline'}
            disabled={isLoading}
            onPress={handleJoinGroup}>
            <ThemedText>{isLoading ? 'Joining...' : 'Join'}</ThemedText>
          </Button>
        )
      ) : (
        <Button variant={'outline'} onPress={handleViewGroup}>
          <ThemedText>View</ThemedText>
        </Button>
      )}
    </View>
  );
};
