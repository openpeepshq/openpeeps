import React, { type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { PublicPost } from '@openpeepshq/common';
import { usePostThreads } from '@openpeepshq/react';
import { FeedPost } from './FeedPost';
import { ThreadedFeed } from './feed/threaded/ThreadedFeed';
import { ReplyBox } from './ReplyBox';

export interface FullPostLayoutProps {
  post: PublicPost;
  deleteCallback?: () => void;
  children?: ReactNode;
}

export const FullPostLayout = ({
  post,
  deleteCallback,
  children,
}: FullPostLayoutProps) => {
  const { ancestryThread, descendentThreads, isLoading } = usePostThreads(
    post.id
  );

  if (isLoading) {
    return (
      <View className="h-32 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      {ancestryThread ? (
        <ThreadedFeed thread={ancestryThread} isAncestors />
      ) : null}
      {children ?? (
        <FeedPost
          post={post}
          deleteCallback={deleteCallback}
          // The page header already names the group. On a repost, keep the
          // banner so it says who shared it instead of hiding that.
          inGroup={!!post.group}
          noReactionHeader={!post.repost}
          hideReply
        />
      )}
      <ReplyBox post={post} />
      {descendentThreads.map((thread) => (
        <ThreadedFeed key={thread.id} thread={thread} />
      ))}
    </>
  );
};
