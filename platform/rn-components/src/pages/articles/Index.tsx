import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { PlusFab, TabScreensHeader } from '../../components/custom/index';
import { FilePlusIcon } from '../../components/icons/index';
import { MainStackParamList } from '../../components/navigation/types/index';
import { ThemedText } from '../../components/ui/themed-text';

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

  return (
    <>
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">
            {t('navigation.articles')}
          </ThemedText>
        }
      />
      <Feed query={articlesQuery} />
      <PlusFab
        accessibilityLabel={t('articles.new')}
        onPress={() => navigation.navigate('NewArticle')}
      >
        <FilePlusIcon size={24} className="text-background" />
      </PlusFab>
    </>
  );
};
