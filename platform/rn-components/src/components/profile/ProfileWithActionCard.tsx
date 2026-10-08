import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import type { PublicProfile } from '@openpeepshq/common';
import { ThemedText } from '~/components/ui/themed-text';
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
    <View className="flex-row items-center gap-2">
      {leading}
      <ProfileLink profile={profile} className="flex-row items-center gap-2">
        <ProfileAvatar profile={profile} />
        <View>
          <ThemedText className="font-bold">
            {profile.displayName || profile.handle}
          </ThemedText>
          <ThemedText className="text-sm text-muted-foreground">
            @{profile.handle}
          </ThemedText>
        </View>
      </ProfileLink>
    </View>
    <FollowUnfollowButton profile={profile} compact />
  </View>
);
