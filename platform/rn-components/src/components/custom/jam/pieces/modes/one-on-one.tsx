import { View } from 'react-native';
import React from 'react';
import { ParticipantView } from '../participant-view';
import {
  TrackReferenceOrPlaceholder,
  useLocalParticipant,
} from '@livekit/react-native';

interface OneOnOneProps {
  stableTracks: TrackReferenceOrPlaceholder[];
}

export const OneOnOne: React.FC<OneOnOneProps> = ({
  stableTracks,
}) => {
  const filteredTracks = stableTracks.filter(track => {
    return track.source === 'camera';
  });
  const { localParticipant } = useLocalParticipant();

  return (
    <View className="flex-1 -mt-7 gap-4 justify-center px-2 items-center">
      <View className="w-full h-1/2 flex justify-center ">
        <ParticipantView
          trackRef={
            filteredTracks.find(
              track =>
                track.participant.identity !== localParticipant.identity,
            ) || filteredTracks[1]
          }
          fullScreen={true}
        />
      </View>
      {filteredTracks.length > 0 && (
        <View className="w-full h-1/2 flex justify-center ">
          <ParticipantView
            trackRef={
              filteredTracks.find(
                track =>
                  track.participant.identity === localParticipant.identity,
              ) || filteredTracks[0]
            }
            fullScreen={true}
          />
        </View>
      )}
    </View>
  );
};
