import { type PublicPost } from '@openpeepshq/common';
import { useFeedPostPresentation } from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types/index';
import {
  PostInfoHeader,
  PostActions,
  PostReactionHeader,
  UnreadPostIndicator,
  FeedThreadPreview,
  FeedPostStats,
} from './pieces';
import React, { type ReactNode } from 'react';
import { CompactReplyParent } from './CompactReplyParent';
import { ThemedView } from '../ui/themed-view';
import { usePostViewRef } from '../../hooks/use-post-view-ref';

import { FeedPostContent } from './FeedPostContent';
export interface FeedPostProps {
  post: PublicPost;
  deleteCallback?: () => void;
  noReactionHeader?: boolean;
  inGroup?: boolean;
  showReplyTo?: boolean;
  /** Optional override for the body (used when threading). */
  content?: ReactNode;
  hideReply?: boolean;
  previewMode?: boolean;
  showMenu?: boolean;
}

export const FeedPost = ({
  post,
  deleteCallback,
  noReactionHeader = false,
  inGroup = false,
  showReplyTo = false,
  content,
  hideReply,
  previewMode = false,
  showMenu = true,
}: FeedPostProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    displayedPost,
    isUnread,
    hasReactionHeader,
    hasStats,
    showsReplyTo,
    showThreadPreview,
    viewContext,
  } = useFeedPostPresentation(post, {
    noReactionHeader,
    inGroup,
    showReplyTo,
  });
  const postViewRef = usePostViewRef(post.id, viewContext);

  if (!post) {
    return null;
  }

  const handlePostPress = () => {
    navigation.navigate('Post', {
      id: displayedPost.id,
    });
  };

  if (!displayedPost?.profile) {
    return <></>;
  }

  return (
    <ThemedView
      ref={postViewRef}
      className="relative py-5 border-b border-border"
    >
      <UnreadPostIndicator show={isUnread} />
      {hasReactionHeader && (
        <PostReactionHeader
          post={post}
          inGroup={inGroup}
          hideReply={hideReply}
          previewMode={previewMode}
        />
      )}
      {showsReplyTo && displayedPost.replyTo ? (
        <CompactReplyParent post={displayedPost.replyTo as PublicPost} />
      ) : null}

      <PostInfoHeader
        post={displayedPost}
        showMenu={!post.repost && !post.inReplyToId && !previewMode && showMenu}
        deleteCallback={deleteCallback}
      />

      <ThemedView className="px-5">
        {content ?? <FeedPostContent post={displayedPost} />}
      </ThemedView>
      {hasStats && (
        <ThemedView className="px-5">
          <FeedPostStats post={displayedPost} />
        </ThemedView>
      )}
      <PostActions
        post={displayedPost}
        previewMode={previewMode}
        onPostPress={handlePostPress}
      />
      {!hideReply && showThreadPreview ? (
        <FeedThreadPreview post={displayedPost} />
      ) : null}
    </ThemedView>
  );
};
