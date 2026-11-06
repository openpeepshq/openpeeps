import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '../../components/navigation/types/index';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { CompositeScreenProps } from '@react-navigation/native';
import { useSetPageHeader } from '../../components/layout';
import { useTranslation } from 'react-i18next';
import { Feed } from '../../components/post/index';

type HighlightsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Highlights'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const FeedsHighlights: React.FC<HighlightsScreenProps> = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useHighlightsFeed(
    useFeedListParams({ limit: 15 })
  );

  useSetPageHeader(t('navigation.highlights'));

  return <Feed query={query} />;
};
