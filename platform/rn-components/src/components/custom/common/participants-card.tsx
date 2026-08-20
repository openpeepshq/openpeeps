import {View} from 'react-native';
import React from 'react';
import type {JamState} from '@openpeepshq/common/types';
import {AvatarFromId} from './avatar-from-id';

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
            {jamState.participants.slice(0, 2).map(participant => (
              <>
                <AvatarFromId id={participant} />
              </>
            ))}
          </>
        ) : (
          <>
            {jamState.participants.map(participant => (
              <>
                <AvatarFromId id={participant} />
              </>
            ))}
          </>
        )}
      </View>
    </View>
  );
};
