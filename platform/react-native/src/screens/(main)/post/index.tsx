import React, { useMemo, useState } from 'react';
import { GenericHeader } from '~/components/custom';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

import { MainScreenProps } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeepshq/react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RefreshControl } from 'react-native-gesture-handler';
import { Group, GroupData, type PublicPost } from '@openpeepshq/common';
import { FullArticle } from '~/components/custom/post/types/article/FullArticle';
import { FullPoll } from '~/components/custom/post/types/poll/FullPoll';
import { FullNote } from '~/components/custom/post/types/note/FullNote';
import {
  FullEvent,
  FullEventActions,
} from '~/components/custom/post/types/event/FullEvent';
import { hasValue, groupName } from '~/lib/utils';

type PostProps = MainScreenProps<'Post'>;

const PostType = ({ post }: { post: PublicPost }) => {
  switch (post.type) {
    case 'event':
      return <FullEvent post={post} />;
    case 'note':
      return <FullNote post={post} />;
    case 'question':
      return <FullPoll post={post} />;
    case 'article':
      return <FullArticle post={post} />;
    default:
      return <FullNote post={post} />;
  }
};

export const Post: React.FC<PostProps> = ({ route }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { id } = route.params;

  const { data: post, refetch: refetchPost } = openpeepsApi.usePost(id);
  const group = useMemo(() => post?.group as Group, [post]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPost()]);
    setRefreshing(false);
  }, [refetchPost]);

  const postTitle = () => {
    if (post?.type === 'event') {
      return (
        <GenericHeader
          title={`Event ${
            hasValue(post?.group?.id) && hasValue(group)
              ? 'in ' + groupName(group as GroupData)
              : ''
          }`}
          rightType="icon"
          rightButtonIcon={<FullEventActions post={post as PublicPost} />}
        />
      );
    } else {
      return <GenericHeader title="Post" />;
    }
  };

  return (
    <ThemedSafeAreaView className="flex-1">
      {postTitle()}
      <KeyboardAwareScrollView
        className="w-full flex bg-background relative "
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {post && <PostType post={post as PublicPost} />}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
