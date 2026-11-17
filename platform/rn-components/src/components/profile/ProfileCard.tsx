import React from 'react';
import { View, TouchableWithoutFeedback, Pressable } from 'react-native';
import type { PublicProfile, Profile } from '@openpeepshq/common/types';
import { markdownPlainText } from '@openpeepshq/common/lib';
import { XIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { truncateText } from '../../lib/utils';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/types/index';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileAvatar } from './Avatar';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileCardProps {
  profile: PublicProfile | Profile;
  /** When provided, clicking the card calls this instead of navigating. */
  onSelect?: (profile: PublicProfile | Profile) => void;
  showAction?: boolean;
  /** Custom action node rendered on the right of the card. */
  action?: React.ReactNode;
  hasAction?: boolean;
  actionType?: 'follow' | 'message' | 'unfollow' | 'link' | 'select';
  handleSelectProfile?: () => void;
  rightComponent?: React.ReactNode;
  /**
   * Drop the default bottom margin and horizontal padding for placements
   * that manage their own spacing (e.g. a bordered strip), mirroring web's
   * tight card-to-border spacing.
   */
  unspaced?: boolean;
}

export const ProfileCard = ({
  profile,
  onSelect,
  showAction = true,
  action,
  actionType = 'link',
  handleSelectProfile,
  rightComponent,
  unspaced = false,
}: ProfileCardProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const handleGoToProfile = () => {
    navigation.navigate('Profile', {
      handle: profile.handle,
    });
  };

  const onPress = () => {
    if (actionType === 'select' && handleSelectProfile) {
      handleSelectProfile();
    }
    if (actionType !== 'select') {
      if (onSelect) {
        onSelect(profile);
      } else {
        handleGoToProfile();
      }
    }
  };

  const bio = markdownPlainText(profile.bio);

  return (
    <View
      className={
        unspaced
          ? 'w-full flex-row items-center justify-between'
          : `w-full flex-row items-center justify-between px-4 ${
              actionType === 'select' ? 'mb-1 py-1' : 'mb-8'
            }`
      }
    >
      <TouchableWithoutFeedback onPress={onPress}>
        <View className="flex flex-row items-center gap-x-2 min-w-0 flex-1">
          <ProfileAvatar
            profile={profile}
            className={actionType === 'select' ? 'size-10' : 'size-16'}
          />
          <View className="min-w-0 flex-1">
            <ThemedText
              className="text-lg font-semibold truncate"
              numberOfLines={1}
            >
              {truncateText(profile.displayName, 18) || profile.handle}
            </ThemedText>
            <ThemedText className="truncate" numberOfLines={1}>
              @{profile.handle}
            </ThemedText>
            {bio ? (
              <ThemedText
                className="text-muted-foreground mt-1 text-sm"
                numberOfLines={2}
              >
                {truncateText(bio, 100)}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </TouchableWithoutFeedback>
      {action ? (
        <View className="flex-shrink-0">{action}</View>
      ) : rightComponent ? (
        <View className="flex-shrink-0">{rightComponent}</View>
      ) : showAction ? (
        <View className="flex-shrink-0">
          <FollowUnfollowButton profile={profile} compact />
        </View>
      ) : null}
    </View>
  );
};

interface MiniProfileCardProps {
  profile: PublicProfile;
  onPress?: (profile: PublicProfile) => void;
  showAction?: boolean;
}

export const MiniProfileCard = ({
  profile,
  onPress,
  showAction = true,
}: MiniProfileCardProps) => {
  return (
    <View className="flex flex-row items-center gap-x-2 rounded-md border border-border px-2 py-2">
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
