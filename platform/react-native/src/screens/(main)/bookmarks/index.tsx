import React from 'react';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import {useOpenpeeps} from '@openpeeps/react';
import {TabScreensHeader, Feed} from '~/components/custom';
import {ThemedText} from '~/components/ui/themed-text';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RefreshControl, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';

type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Bookmarks'>,
  NativeStackScreenProps<MainStackParamList>
>;
export const BookmarksFeed: React.FC<HomeScreenProps> = ({}) => {
  const {openpeepsApi} = useOpenpeeps();
  const {t} = useTranslation();

  const query = openpeepsApi.useBookmarkedPosts({limit: 15});
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([query.refetch()]);
    setRefreshing(false);
  }, [query]);

  return (
    <>
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">
            {t('navigation.bookmarks')}
          </ThemedText>
        }
      />
      <ScrollView
        className="bg-background"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Feed query={query} />
      </ScrollView>
    </>
  );
};
