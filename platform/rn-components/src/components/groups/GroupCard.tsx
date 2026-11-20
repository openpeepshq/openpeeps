import { Pressable, View } from 'react-native';
import React from 'react';
import { GroupWithMeta } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ThemedText } from '../ui/themed-text';
import { UnreadBadge } from '../ui/unread-badge';
import { Button } from '../ui/button';
import { UsersIcon } from '../icons/index';
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
    <View className="flex flex-row items-center justify-between w-full mb-8">
      <Pressable
        onPress={handleViewGroup}
        className="flex min-w-0 flex-1 flex-row items-center gap-x-2"
      >
        <Avatar alt="profile" className="size-16 shrink-0">
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
        <View className="ml-2 min-w-0 flex-1">
          <View className="flex-row items-center gap-x-2">
            <ThemedText
              className="min-w-0 flex-1 text-lg font-semibold"
              numberOfLines={1}
            >
              {group.displayName || '-'}
            </ThemedText>
            {unreadCount > 0 ? (
              <UnreadBadge count={unreadCount} className="shrink-0" />
            ) : null}
          </View>
          <View className="flex-row gap-x-3 mt-2 items-center">
            <ThemedText className="text-sm" numberOfLines={1}>
              {t('groups.members.count', { count: group?.membersCount ?? 0 })}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      <View className="flex shrink-0 ml-2">
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
    </View>
  );
};
