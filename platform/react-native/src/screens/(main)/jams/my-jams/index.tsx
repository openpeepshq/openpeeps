import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MoreVerticalIcon } from '~/components/icons';
import {
  GenericHeader,
  NewJamButton,
} from '~/components/custom';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { EventsFeed } from '~/components/custom/post/feed/events/EventsFeed';

export const MyJams = ({ }: NativeStackScreenProps<MainStackParamList, 'MyJams'>) => {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.useMyUpcomingJamsFeed();

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader title="My Jams" rightButtonIcon={<MoreVerticalIcon />} />
      <NewJamButton />
      <KeyboardAwareScrollView className="flex-1 w-full flex bg-background relative p-2">
        <EventsFeed query={query} type="jam" />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
