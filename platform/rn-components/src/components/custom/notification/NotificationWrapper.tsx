import { View } from 'react-native';
import React from 'react';
import type { Group, Profile } from '@openpeepshq/common/types';
import { DotIcon, UsersIcon, UserIcon } from '~/components/icons';
import { ThemedView } from '~/components/ui/themed-view';
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
    <ThemedView className="w-full border-b-[0.2px] border-b-muted-foreground px-2 py-3">
      {/* Outer row: avatar column + content column + dot column */}
      <View className="flex-row items-start w-full gap-3">

        {/* Avatar area */}
        {showProfile && (
          <View className="flex-row items-center gap-2 flex-shrink-0">
            {group ? (
              <>
                <UsersIcon className="h-6 w-6 text-foreground" />
                <GroupAvatar group={group} className="w-12 h-12" />
              </>
            ) : (
              <>
                <UserIcon className="h-6 w-6 text-foreground" />
                <ProfileAvatar profile={profile} className="w-12 h-12" />
              </>
            )}
          </View>
        )}

        {/* Notification content — takes remaining space */}
        <View className="flex-1">
          {children}
        </View>

        {/* Unseen dot */}
        {!seen && (
          <View className="flex-shrink-0 pt-1">
            <DotIcon className="h-4 w-4 text-primary" />
          </View>
        )}

      </View>
    </ThemedView>
  );
};