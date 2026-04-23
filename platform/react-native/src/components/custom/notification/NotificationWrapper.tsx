import { View } from 'react-native';
import React from 'react';
import type { Group, Profile } from '@openpeeps/common/types';
import { DotIcon, UsersIcon, UserIcon } from '../../icons';
import { ThemedView } from '../../ui/themed-view';
import { ProfileAvatar } from '../profile/profile-avatar';
import { GroupAvatar } from '../groups/GroupAvatar';

interface NotificationWrapperProps {
  profile: Profile;
  seen?: boolean;
  group?: Group | null;
  showProfile?: boolean;
  children?: React.ReactNode;
}

export const NotificationWrapper: React.FC<NotificationWrapperProps> = ({
  profile,
  group,
  seen = true,
  showProfile = true,
  children,
}) => {
  return (
    <ThemedView className="w-full flex gap-3 border-b-muted-foreground border-b-[0.2px] px-2 py-3">
      <View className="w-full items-end flex justify-end">
        {!seen && <DotIcon className="h-6 w-6 text-primary" />}
      </View>
      {showProfile && (
        <View className="flex-shrink-0">
          <View className="flex flex-row items-center gap-4 ">
            {group ? (
              <>
                <UsersIcon className="h-8 w-8 text-foreground" />
                <GroupAvatar group={group} className="w-16 h-16" />
              </>
            ) : (
              <>
                <UserIcon className="h-8 w-8 text-foreground" />
                <ProfileAvatar profile={profile} className="w-16 h-16" />
              </>
            )}

          </View>
        </View>
      )}
      <View className="flex flex-1 flex-col">
        <View className="flex w-full items-start justify-between">
          <View className="flex-1 w-full">{children}</View>
        </View>
      </View>
    </ThemedView>
  );
};
