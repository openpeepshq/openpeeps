import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useOpenpeeps } from '@openpeeps/react';
import type { QueryObserverResult } from '@tanstack/react-query';
import { FeedPostContent } from '../../post/pieces';
import { AccessDenied } from '../AccessDenied';

interface PostPreviewProps {
  path: string;
}

export const PostPreview = ({ path }: PostPreviewProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const postId = path.split('/')[2];

  const {
    data: post,
    isLoading,
    isError,
  } = openpeepsApi.usePost(postId);

  if (isLoading) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    const errorQuery = { isError: true } as QueryObserverResult<unknown, unknown>;
    return <AccessDenied queries={[errorQuery]} />;
  }

  if (!post) {
    return null;
  }

  return <FeedPostContent post={post} />;
};

