import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicProfile } from '@openpeepshq/common';
import { MainStackParamList } from '../navigation/types/index';
import { ThemedText } from '../ui/themed-text';

export interface ProfileStatsProps {
  profile: PublicProfile;
}

export const ProfileStats = ({ profile }: ProfileStatsProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View className="mt-2 flex-row items-center gap-x-4">
      <Pressable
        onPress={() =>
          navigation.navigate('ProfileFollowers', { id: profile.id })
        }
      >
        <ThemedText className="text-sm">
          <ThemedText className="text-sm font-semibold">
            {profile.profileStats?.followersCount ?? 0}
          </ThemedText>{' '}
          {t('profile.followers.title')}
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() =>
          navigation.navigate('ProfileFollowing', { id: profile.id })
        }
      >
        <ThemedText className="text-sm">
          <ThemedText className="text-sm font-semibold">
            {profile.profileStats?.followingCount ?? 0}
          </ThemedText>{' '}
          {t('profile.following.title')}
        </ThemedText>
      </Pressable>
    </View>
  );
};
