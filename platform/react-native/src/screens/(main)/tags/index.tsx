import React from 'react';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  TabScreensHeader,
  Feed,
} from '~/components/custom';
import { ThemedText } from '~/components/ui/themed-text';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RefreshControl, ScrollView } from 'react-native';

type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'HashtagPosts'>,
  NativeStackScreenProps<MainStackParamList>
>;
export const HashtagPosts: React.FC<HomeScreenProps> = ({
  route,
}) => {
  const { openpeepsApi } = useOpenpeeps();
  const { tag } = route.params;

  const query = openpeepsApi.usePostsByHashtag(tag, { limit: 15 });
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([query.refetch()]);
    setRefreshing(false);
  }, [query]);

  return (
    <>
      <TabScreensHeader
        children={<ThemedText className="text-xl font-bold">#{tag}</ThemedText>}
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
