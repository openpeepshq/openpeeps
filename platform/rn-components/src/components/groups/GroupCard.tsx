import { Pressable, View } from 'react-native';
import React from 'react';
import { formatBadgeCount, GroupWithMeta } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { ThemedText } from '~/components/ui/themed-text';
import { truncateText } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { UsersIcon } from '~/components/icons';
import { useTranslation } from 'react-i18next';
import { JoinGroupButton } from './JoinGroupButton';

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
  const { queryClient } = useOpenpeeps();
  const { t } = useTranslation();

  return (
    <View className="flex flex-row justify-between w-full mb-8">
      <Pressable
        onPress={handleViewGroup}
        className="flex flex-row items-center gap-x-2"
      >
        <Avatar alt="profile" className="size-16">
          {group?.avatar ? (
            <AvatarImage
              source={{
                uri: group?.avatar,
              }}
            />
          ) : (
            <AvatarFallback>
              <UsersIcon size={20} className="text-foreground" />
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
                  {formatBadgeCount(unreadCount)}
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
        <JoinGroupButton
          group={group}
          onJoined={async () => {
            await queryClient.invalidateQueries();
            handleViewGroup();
          }}
        />
      ) : (
        <Button variant="outline" onPress={handleViewGroup}>
          <ThemedText>{t('groups.actions.view')}</ThemedText>
        </Button>
      )}
    </View>
  );
};
