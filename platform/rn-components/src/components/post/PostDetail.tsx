import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { FullNote } from './types/note/FullNote';
import { FullArticle } from './types/article/FullArticle';
import { FullPoll } from './types/poll/FullPoll';
import { FullEvent } from './types/event/FullEvent';

export interface PostDetailProps {
  postId: string;
  /** Native-only: which occurrence of a recurring event is shown. */
  occurrence?: string;
}

export const PostDetail = ({ postId, occurrence }: PostDetailProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(postId);
  const post = postQuery.data;

  if (postQuery.isLoading) {
    return (
      <View className="h-32 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ThemedText className="text-2xl font-bold">
          {t('post.notFound', { defaultValue: 'Post not found' })}
        </ThemedText>
      </View>
    );
  }

  switch (post.type) {
    case 'article':
      return <FullArticle post={post} />;
    case 'event':
      return <FullEvent post={post} occurrence={occurrence} />;
    case 'question':
      return <FullPoll post={post} />;
    case 'note':
    default:
      return <FullNote post={post} />;
  }
};
