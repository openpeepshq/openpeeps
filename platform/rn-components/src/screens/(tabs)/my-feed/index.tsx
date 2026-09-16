import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '~/components/navigation/types';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { CompositeScreenProps } from '@react-navigation/native';
import { Feed, TabScreensHeader } from '~/components/custom';
import { ThemedText } from '~/components/ui/themed-text';

type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Feed'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const MyFeed: React.FC<HomeScreenProps> = () => {
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useMyFeed(useFeedListParams({ limit: 15 }));

  return (
    <>
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">My feed</ThemedText>
        }
      />
      <Feed query={query} />
    </>
  );
};
