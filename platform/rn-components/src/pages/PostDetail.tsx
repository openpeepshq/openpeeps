import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps, usePostDetailTitle } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { MainScreenProps } from '~/components/navigation/types';
import { PostDetail as PostDetailComponent } from '~/components/post';
import { FullEventActions } from '~/components/post/types/event/FullEvent';

type PostProps = MainScreenProps<'Post'>;

export const PostDetail = ({ route }: PostProps) => {
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

  return (
    <ThemedSafeAreaView className="flex-1">
      {post?.type === 'event' ? (
        <GenericHeader
          title={title}
          rightType="icon"
          rightButtonIcon={
            <FullEventActions post={post} occurrence={occurrence} />
          }
        />
      ) : (
        <GenericHeader title={title} />
      )}
      <KeyboardAwareScrollView
        className="w-full flex bg-background relative"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <PostDetailComponent postId={id} occurrence={occurrence} />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
