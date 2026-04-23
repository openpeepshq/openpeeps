import {View} from 'react-native';
import React from 'react';
import {Profile} from '@openpeeps/common';
import {ThemedText} from '../../ui/themed-text';
import {ProfileImages, ProfileName} from '../common/profile-pieces';

export const ConversationProfileHeader = ({
  participants,
}: {
  participants: Profile[];
}) => {
  return (
    <View className="flex-row gap-x-2 items-center">
      <ProfileImages profile={participants || []} avatarSize={32} />
      <ThemedText className="font-semibold">
        <ProfileName profile={participants} />
      </ThemedText>
    </View>
  );
};
