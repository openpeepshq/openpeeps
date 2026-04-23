import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '../../../components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { CompositeScreenProps } from '@react-navigation/native';
import { TabScreensHeader } from '../../../components/custom';
import { ThemedText } from '../../../components/ui/themed-text';
import { useTranslation } from 'react-i18next';
import { Feed } from '../../../components/custom/post/feed';

type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Home: React.FC<HomeScreenProps> = () => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { data: serverInfo, refetch: refetchServerInfo } =
    openpeepsApi.useServerInfo();

  const pinnedPostId = serverInfo?.communityConfig?.content?.pinnedPost;

  const query = openpeepsApi.useLocalFeed({
    limit: 15,
  });

  return (
    <>
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">
            {t('navigation.community')}
          </ThemedText>
        }
      />

      <Feed
        query={query}
        pinnedPostId={pinnedPostId}
        refetchServerInfo={refetchServerInfo}
      />
    </>
  );
};
