import React from 'react';
import { assignableGroupRoles, getProfileAvatar, type GroupMember } from '@openpeepshq/common';
import { View, Pressable } from 'react-native';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import {
  MessageSquareTextIcon,
  MoreHorizontalIcon,
  UserCogIcon,
  UserMinusIcon,
} from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { truncateText } from '~/lib/utils';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const staffRoles = ['owner', 'admin', 'moderator'] as const;

interface GroupMemberCardProps {
  member: GroupMember;
  handleMessageMember?: () => void;
  handleSetRole?: (role: 'member' | 'moderator' | 'admin' | 'owner') => void;
  handleRemoveMember?: () => void;
  canChangeRoles?: boolean;
  isCurrentProfileOwner?: boolean;
  showActions?: boolean;
}

export const GroupMemberCard = ({
  member,
  showActions = true,
  canChangeRoles = false,
  isCurrentProfileOwner = false,
  handleMessageMember,
  handleSetRole,
  handleRemoveMember,
}: GroupMemberCardProps) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: server } = openpeepsApi.useServerInfo();
  const { t } = useTranslation();

  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const visibleRoles = assignableGroupRoles(isCurrentProfileOwner);

  return (
    <View className="flex flex-row justify-between w-full px-4 mb-8">
      <Pressable
        onPress={() => {
          navigation.navigate('Profile', {
            handle: member.profile.handle,
          });
        }}
        className="flex flex-row items-center gap-x-2"
      >
        <Avatar alt="profile" className="size-16">
          <AvatarImage
            source={{
              uri: server
                ? getProfileAvatar(member.profile, server.communityConfig)
                : member.profile.avatar,
            }}
          />
        </Avatar>
        <View className="">
          <ThemedText className="text-lg font-semibold">
            {currentProfile?.id === member.profile.id
              ? 'You'
              : truncateText(member.profile.displayName, 18) || '-'}
          </ThemedText>
          <ThemedText className="text-muted-foreground">
            @{member.profile.handle}
          </ThemedText>
          <View className="flex flex-row flex-wrap gap-1 mt-1">
            {staffRoles
              .filter((role) => member.roles?.includes(role))
              .map((role) => (
                <View key={role} className="bg-foreground px-1 py-1 rounded-md">
                  <ThemedText className="text-background text-center">
                    {t(`groups.roles.${role}`, { defaultValue: role })}
                  </ThemedText>
                </View>
              ))}
          </View>
        </View>
      </Pressable>
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Pressable className="flex items-center justify-center p-3">
              <MoreHorizontalIcon size={16} className="text-foreground" />
            </Pressable>
          </DropdownMenuTrigger>
          <DropdownMenuContent className=" mt-1">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onPress={handleMessageMember}
                className=" flex-row gap-x-2 items-center"
              >
                <MessageSquareTextIcon size={16} className="text-foreground" />
                <ThemedText>Message @{member.profile.handle}</ThemedText>
              </DropdownMenuItem>
              {canChangeRoles &&
                visibleRoles.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onPress={() => handleSetRole?.(role)}
                    className=" flex-row gap-x-2 items-center"
                  >
                    <UserCogIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {t(`groups.roles.${role}`, { defaultValue: role })}
                    </ThemedText>
                  </DropdownMenuItem>
                ))}
              {canChangeRoles && (
                <DropdownMenuItem
                  onPress={handleRemoveMember}
                  className=" flex-row gap-x-2 items-center"
                >
                  <UserMinusIcon size={16} className="text-destructive" />
                  <ThemedText className="text-destructive">
                    Remove @{member.profile.handle}
                  </ThemedText>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </View>
  );
};
