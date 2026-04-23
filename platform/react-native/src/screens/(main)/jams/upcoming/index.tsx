import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { GenericHeader } from '~/components/custom';
import { MoreVerticalIcon } from '~/components/icons';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { EventsFeed } from '~/components/custom/post/feed/events/EventsFeed';

export const UpcomingJams = ({ }: NativeStackScreenProps<MainStackParamList, 'UpcomingJams'>) => {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.useUpcomingJamsFeed();

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title="Upcoming jams"
        rightType="icon"
        rightButtonIcon={<MoreVerticalIcon className="text-foreground" />}
      />
      <KeyboardAwareScrollView className="flex-1 w-full flex bg-background relative p-2">
        <EventsFeed query={query} type="jam" />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
