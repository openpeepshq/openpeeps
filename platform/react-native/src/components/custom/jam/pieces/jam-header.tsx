import { View } from 'react-native';
import React from 'react';
import { Button } from '../../../ui/button';
import { ArrowLeftIcon, CalendarIcon } from '../../../icons';
import { ThemedText } from '../../../ui/themed-text';
import { AudioOutputList } from './audio-output-list';
import { useJamStore } from '../../../../stores/useJamStore';
import { truncateText } from '../../../../lib/utils';

interface JamHeaderProps {
  handleGoBack: () => void;
}

export const JamHeader: React.FC<JamHeaderProps> = ({ handleGoBack }) => {
  const { jamEvent } = useJamStore();
  return (
    <View className="flex-row border-b border-input mb-10 justify-between p-4 items-center">
      <Button variant="ghost" size="icon" onPress={handleGoBack}>
        <ArrowLeftIcon size={24} className="text-foreground" />
      </Button>
      <View className="flex-row items-center">
        <CalendarIcon size={20} className="text-foreground" />
        <ThemedText className=" ml-2 font-medium">
          {truncateText(jamEvent?.name || 'Jam', 50)}
        </ThemedText>
      </View>
      <AudioOutputList />
    </View>
  );
};
