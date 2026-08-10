import React from 'react';
import {GroupMember} from '@openpeepshq/common';
import {View, Pressable} from 'react-native';
import {Avatar, AvatarImage} from '~/components/ui/avatar';
import {
  MessageSquareTextIcon,
  MoreHorizontalIcon,
  UserCogIcon,
  UserMinusIcon,
  UserXIcon,
} from '~/components/icons';
import {ThemedText} from '~/components/ui/themed-text';
import { truncateText} from '~/lib/utils';
import {useOpenpeeps} from '@openpeepshq/react';
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

interface GroupMemberCardProps {
  member: GroupMember;
  handleMessageMember?: () => void;
  handleMakeAdmin?: () => void;
  handleRemovePrivilegesAdmin?: () => void;
  handleRemoveMember?: () => void;
  isCurrentProfileAdmin?: boolean;
  showActions?: boolean;
}

export const GroupMemberCard = ({
  member,
  showActions = true,
  isCurrentProfileAdmin = false,
  handleMessageMember,
  handleMakeAdmin,
  handleRemovePrivilegesAdmin,
  handleRemoveMember,
}: GroupMemberCardProps) => {
  const {openpeepsApi, currentProfile} = useOpenpeeps();
  const {data: server} = openpeepsApi.useServerInfo();

  const navigation =
  useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View className="flex flex-row justify-between w-full px-4 mb-8">
      <Pressable
      onPress={() => {
        navigation.navigate('Profile', {
          handle: member.profile.handle,
        });
      }}
      className="flex flex-row items-center gap-x-2">
        <Avatar alt="profile" className="size-16">
          {member.profile.avatar ? (
            <AvatarImage
              source={{
                uri: member.profile.avatar,
              }}
            />
          ) : (
            <AvatarImage
              source={{
                uri: server?.communityConfig.theme.defaultProfileAvatar,
              }}
            />
          )}
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
          {member?.roles?.includes('admin') && (
            <View className="bg-foreground px-1 py-1 rounded-md">
              <ThemedText className="text-background text-center">
                Admin{' '}
              </ThemedText>
            </View>
          )}
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
                className=" flex-row gap-x-2 items-center">
                <MessageSquareTextIcon size={16} className="text-foreground" />
                <ThemedText>Message @{member.profile.handle}</ThemedText>
              </DropdownMenuItem>
              {isCurrentProfileAdmin && (
                <>
                  {member?.roles?.includes('admin') ? (
                    <DropdownMenuItem
                      onPress={handleRemovePrivilegesAdmin}
                      className=" flex-row gap-x-2 items-center">
                      <UserXIcon size={16} className="text-foreground" />
                      <ThemedText>Remove admin privileges</ThemedText>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onPress={handleMakeAdmin}
                      className=" flex-row gap-x-2 items-center">
                      <UserCogIcon size={16} className="text-foreground" />
                      <ThemedText>Make group admin</ThemedText>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onPress={handleRemoveMember}
                    className=" flex-row gap-x-2 items-center">
                    <UserMinusIcon size={16} className="text-destructive" />
                    <ThemedText className="text-destructive">
                      Remove @{member.profile.handle}
                    </ThemedText>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </View>
  );
};
