import { View, Text } from 'react-native';
import React from 'react';
import { ParticipantView } from '../participant-view';
import { ThemedText } from '../../../../ui/themed-text';
import { truncateText } from '../../../../../lib/utils';
import { CopyIcon } from '../../../../icons';
import { Button } from '../../../../ui/button';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../../../../../lib/constants';
import { useJamStore } from '../../../../../stores/useJamStore';
import { TrackReferenceOrPlaceholder } from '@livekit/react-native';

interface AloneProps {
  stableTracks: TrackReferenceOrPlaceholder[];
}

export const Alone: React.FC<AloneProps> = ({
  stableTracks,
}) => {
  const { jamPost } = useJamStore();

  const jamLink = `${BASE_URL}/events/${jamPost?.id}/jam`;
  return (
    <View className="flex-1 justify-center items-center">
      {stableTracks.length > 0 && (
        <View className="absolute bottom-3 right-3">
          <ParticipantView trackRef={stableTracks[0]} />
        </View>
      )}
      <View className="px-5 z-10">
        <ThemedText className="text-xl font-medium mb-2">
          You're the only one here
        </ThemedText>
        <ThemedText className="mb-4">
          Share this jam link with others you want in it
        </ThemedText>
        <View className="bg-[#111] w-full py-1 pl-2 rounded-lg flex-row justify-between items-center mb-4">
          <Text className="text-white" numberOfLines={2}>
            {truncateText(jamLink, 40)}
          </Text>
          <Button
            variant="ghost"
            onPress={() => {
              Clipboard.setString(jamLink);
              Toast.show({
                type: 'success',
                text1: 'Link copied to clipboard',
              });
            }}>
            <CopyIcon size={20} color="white" />
          </Button>
        </View>
      </View>
    </View>
  );
};
