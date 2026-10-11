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
import { useSetPageHeader } from '../../components/layout';
import { useTranslation } from 'react-i18next';
import { Feed, NewNoteButton } from '../../components/post/index';

type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const FeedsLocal: React.FC<HomeScreenProps> = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { data: serverInfo, refetch: refetchServerInfo } =
    openpeepsApi.useServerInfo();

  const pinnedPostId = serverInfo?.communityConfig?.content?.pinnedPost;
  const visibility = useDefaultVisibility();

  const query = openpeepsApi.useLocalFeed(useFeedListParams({ limit: 15 }));

  useSetPageHeader(t('navigation.community'));

  return (
    <>
      <Feed
        query={query}
        pinnedPostId={pinnedPostId}
        refetchServerInfo={refetchServerInfo}
      />
      <NewNoteButton visibility={visibility} />
    </>
  );
};
