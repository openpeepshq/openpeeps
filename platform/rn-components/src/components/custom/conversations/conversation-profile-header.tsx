import {Pressable, View} from 'react-native';
import React from 'react';
import {Profile} from '@openpeepshq/common';
import {ThemedText} from '~/components/ui/themed-text';
import {ProfileImages, ProfileName} from '../common/profile-pieces';

export const ConversationProfileHeader = ({
  participants,
  onPress,
}: {
  participants: Profile[];
  onPress?: () => void;
}) => {
  const content = (
    <View className="flex-row gap-x-2 items-center">
      <ProfileImages profile={participants || []} avatarSize={32} />
      <ThemedText className="font-semibold" numberOfLines={1}>
        <ProfileName profile={participants} />
      </ThemedText>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
};
