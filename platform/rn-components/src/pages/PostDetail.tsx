import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps, usePostDetailTitle } from '@openpeepshq/react';
import { useSetPageHeader } from '../components/layout';
import { ThemedView } from '../components/ui/themed-view';
import { MainScreenProps } from '../components/navigation/types/index';
import { goToParentOrBack } from '../components/navigation/parent-back';
import { PostDetail as PostDetailComponent } from '../components/post/index';
import { FullEventActions } from '../components/post/types/event/FullEvent';

type PostProps = MainScreenProps<'Post'>;

export const PostDetail = ({ route, navigation }: PostProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { id, occurrence } = route.params;
  const { post, kindTitle, groupLabel, inGroup } = usePostDetailTitle(id);
  const { refetch } = openpeepsApi.usePost(id);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const title = inGroup
    ? `${kindTitle} ${t('post.detail.inGroup')} ${groupLabel}`
    : kindTitle;

  const handleGoBack = () =>
    goToParentOrBack({
      navigation,
      routeName: 'Post',
      params: route.params,
      post,
    });

  useSetPageHeader(
    title,
    post?.type === 'event' ? (
      <FullEventActions post={post} occurrence={occurrence} />
    ) : undefined,
    handleGoBack
  );

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        className="w-full flex bg-background relative"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <PostDetailComponent postId={id} occurrence={occurrence} />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
