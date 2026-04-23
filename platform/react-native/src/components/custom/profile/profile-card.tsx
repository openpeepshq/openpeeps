import { View, TouchableWithoutFeedback, Pressable } from 'react-native';
import React from 'react';
import { Profile } from '@openpeeps/common';
import { XIcon } from '../../icons';
import { ThemedText } from '../../ui/themed-text';
import { truncateText } from '../../../lib/utils';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileAvatar } from './profile-avatar';

interface ProfileCardProps {
  profile: Profile;
  hasAction?: boolean;
  actionType?: 'follow' | 'message' | 'unfollow' | 'link' | 'select';
  handleSelectProfile?: () => void;
  rightComponent?: React.ReactNode;
}
export const ProfileCard = ({
  actionType = 'link',
  handleSelectProfile,
  profile,
  rightComponent,
}: ProfileCardProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const handleGoToProfile = () => {
    navigation.navigate('Profile', {
      handle: profile.handle,
    });
  };

  return (
    <View className="flex flex-row justify-between w-full px-4 mb-8">
      <TouchableWithoutFeedback
        onPress={() => {
          if (actionType === 'select' && handleSelectProfile) {
            handleSelectProfile();
          }
          if (actionType !== 'select') {
            handleGoToProfile();
          }
        }}>
        <View className="flex flex-row items-center gap-x-2">
          <ProfileAvatar profile={profile} className="size-16"/>
          <View className="">
            <ThemedText className="text-lg font-semibold">
              {truncateText(profile.displayName, 18) || profile.handle}
            </ThemedText>
            <ThemedText className="">@{profile.handle}</ThemedText>
          </View>
        </View>
      </TouchableWithoutFeedback>
      {rightComponent}
    </View>
  );
};

interface MiniProfileCardProps {
  profile: Profile;
  onPress?: (profile: Profile) => void;
  showAction?: boolean;
}

export const MiniProfileCard = ({
  profile,
  onPress,
  showAction = true,
}: MiniProfileCardProps) => {

  return (
    <View className="flex flex-row gap-x-2 items-center px-2 py-2 border rounded-md border-gray-600">
      <ProfileAvatar profile={profile} className="size-8" />
      <ThemedText>
        {truncateText(profile.displayName, 10) || `@${profile.handle}`}
      </ThemedText>
      {showAction && (
        <Pressable onPress={() => onPress && onPress(profile)}>
          <XIcon size={16} className="text-foreground" />
        </Pressable>
      )}
    </View>
  );
};
