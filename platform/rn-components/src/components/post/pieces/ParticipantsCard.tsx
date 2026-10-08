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
    <View className="flex w-full justify-between gap-4 p-5">
      <View className="flex items-center">
        {jamState.participants.length > 2 ? (
          <>
            {jamState.participants.slice(0, 2).map((participant) => (
              <>
                <ProfileFromId id={participant} />
              </>
            ))}
          </>
        ) : (
          <>
            {jamState.participants.map((participant) => (
              <>
                <ProfileFromId id={participant} />
              </>
            ))}
          </>
        )}
      </View>
    </View>
  );
};
