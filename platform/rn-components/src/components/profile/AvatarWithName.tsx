import React from 'react';
import { View } from 'react-native';
import type { PublicProfile } from '@openpeepshq/common';
import { ThemedText } from '~/components/ui/themed-text';
import { ProfileAvatar } from './Avatar';

export interface AvatarWithNameProps {
  profile?: PublicProfile;
}

export const AvatarWithName = ({ profile }: AvatarWithNameProps) => (
  <View className="flex-row items-center gap-2">
    {profile ? <ProfileAvatar profile={profile} className="size-8" /> : null}
    <ThemedText className="text-sm">
      {profile?.displayName || profile?.handle}
    </ThemedText>
  </View>
);
