import React from 'react';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../components/navigation/types/index';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RefreshControl, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Feed } from '../../components/post/index';
type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Bookmarks'>,
  NativeStackScreenProps<MainStackParamList>
>;
export const FeedsBookmarks: React.FC<HomeScreenProps> = ({}) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();

  const query = openpeepsApi.useBookmarkedPosts(
    useFeedListParams({ limit: 15, format: 'linear' })
  );
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([query.refetch()]);
    setRefreshing(false);
  }, [query]);

  useSetPageHeader(t('navigation.bookmarks'));

  return (
    <>
      <ScrollView
        className="bg-background"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Feed query={query} formatSwitch={false} />
      </ScrollView>
    </>
  );
};
