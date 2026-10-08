import React from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { FeedNote } from './types/Note';
import { FeedPoll } from './types/Poll';
import { FeedEvent } from './types/Event';
import { FeedArticle } from './types/Article';
import { View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { useTranslation } from 'react-i18next';

interface FeedPostContentProps {
  post: PublicPost;
}

export const FeedPostContent = ({ post }: FeedPostContentProps) => {
  const { t } = useTranslation();
  if (post.hidden) {
    return (
      <View>
        <ThemedText className="text-sm text-muted-foreground">
          {t('posts.hiddenMessage')}
        </ThemedText>
      </View>
    );
  }
  if (post.deletedAt) {
    return (
      <View className="text-sm text-gray-500">This post has been deleted.</View>
    );
  }
  if (post.type === 'note') {
    return <FeedNote {...{ post }} />;
  }
  if (post.type === 'question') {
    return <FeedPoll {...{ post }} />;
  }
  if (post.type === 'event') {
    return <FeedEvent {...{ post }} />;
  }
  if (post.type === 'article') {
    return <FeedArticle {...{ post }} />;
  }
  return (
    <View>
      <ThemedText className="text-red-500">
        This post type is not supported.
      </ThemedText>
    </View>
  );
};
