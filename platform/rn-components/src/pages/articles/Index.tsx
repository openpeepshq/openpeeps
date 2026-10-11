import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import {
  useSetPageHeader,
  useSetPlusButtonActions,
} from '../../components/layout';
import { MainStackParamList } from '../../components/navigation/types/index';

import { Feed } from '../../components/post/index';
export const ArticlesIndex = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const articlesQuery = openpeepsApi.usePostsByType(
    'article',
    useFeedListParams({ limit: 15 })
  );

  useSetPageHeader(t('navigation.articles'));
  useSetPlusButtonActions({
    title: t('articles.new'),
    action: () => navigation.navigate('NewArticle'),
  });

  return <Feed query={articlesQuery} />;
};
