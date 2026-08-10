import React from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { FeedNote } from '../types/note/FeedNote';
import { FeedPoll } from '../types/poll/FeedPoll';
import { FeedEvent } from '../types/event/FeedEvent';
import { FeedArticle } from '../types/article/FeedArticle';
import { View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';

interface FeedPostContentProps {
  post: PublicPost;
}


export const FeedPostContent = ({ post }: FeedPostContentProps) => {
  if (post.deletedAt) {
    return <View className="text-sm text-gray-500">This post has been deleted.</View>;
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
  return <View><ThemedText className="text-red-500">This post type is not supported.</ThemedText></View>;
};
