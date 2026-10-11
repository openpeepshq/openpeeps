import { View } from 'react-native';
import React from 'react';
import type { JamState } from '@openpeepshq/common/types';
import { ProfileFromId } from '../../profile/ProfileFromId';

interface ParticipantsCardProps {
  jamState: JamState;
}

export const ParticipantsCard: React.FC<ParticipantsCardProps> = ({
  jamState,
}) => {
  return (
    <View className="flex-row items-center">
      {jamState.participants.slice(0, 2).map((participant) => (
        <ProfileFromId key={participant} id={participant} />
      ))}
    </View>
  );
};
