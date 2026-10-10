import React from 'react';
import {
  MainStackParamList,
  TabStackParamList,
} from '../components/navigation/types/index';
import {
  useDefaultVisibility,
  useFeedListParams,
  useOpenpeeps,
} from '@openpeepshq/react';
import { TabScreensHeader } from '../components/custom/index';
import { ThemedText } from '../components/ui/themed-text';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RefreshControl, ScrollView } from 'react-native';

import { Feed, NewNoteButton } from '../components/post/index';
type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'HashtagPosts'>,
  NativeStackScreenProps<MainStackParamList>
>;
export const Tags: React.FC<HomeScreenProps> = ({ route }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { tag } = route.params;
  const visibility = useDefaultVisibility();

  const query = openpeepsApi.usePostsByHashtag(
    tag,
    useFeedListParams({ limit: 15, format: 'linear' })
  );
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
        }
      >
        <Feed query={query} formatSwitch={false} />
      </ScrollView>
      <NewNoteButton visibility={visibility} />
    </>
  );
};
