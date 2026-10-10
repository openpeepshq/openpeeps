import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '../../components/navigation/types/index';
import {
  useDefaultVisibility,
  useFeedListParams,
  useOpenpeeps,
} from '@openpeepshq/react';
import { CompositeScreenProps } from '@react-navigation/native';
import { TabScreensHeader } from '../../components/custom/index';
import { ThemedText } from '../../components/ui/themed-text';

import { useTranslation } from 'react-i18next';
import { Feed, NewNoteButton } from '../../components/post/index';
type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Feed'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const FeedsMy: React.FC<HomeScreenProps> = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useMyFeed(useFeedListParams({ limit: 15 }));
  const visibility = useDefaultVisibility();

  return (
    <>
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">
            {t('navigation.myFeed')}
          </ThemedText>
        }
      />
      <Feed query={query} />
      <NewNoteButton visibility={visibility} />
    </>
  );
};
