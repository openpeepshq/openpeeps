import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import type { PublicProfile } from '@openpeepshq/common';
import { ThemedText } from '../ui/themed-text';
import { ProfileAvatar } from './Avatar';
import { ProfileLink } from './ProfileLink';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileWithActionCardProps {
  profile: PublicProfile;
  leading?: ReactNode;
}

export const ProfileWithActionCard = ({
  profile,
  leading,
}: ProfileWithActionCardProps) => (
  <View className="mb-4 w-full flex-row items-center justify-between">
    <View className="flex min-w-0 flex-1 flex-row items-center gap-2">
      {leading}
      <ProfileLink
        profile={profile}
        className="flex min-w-0 flex-1 flex-row items-center gap-2"
      >
        <ProfileAvatar profile={profile} />
        <View className="min-w-0 flex-1">
          <ThemedText className="font-bold" numberOfLines={1}>
            {profile.displayName || profile.handle}
          </ThemedText>
          <ThemedText
            className="text-sm text-muted-foreground"
            numberOfLines={1}
          >
            @{profile.handle}
          </ThemedText>
        </View>
      </ProfileLink>
    </View>
    <View className="shrink-0">
      <FollowUnfollowButton profile={profile} compact />
    </View>
  </View>
);
