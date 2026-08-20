import { type PublicPost } from '@openpeepshq/common';
import {
  isUnreadFeedActivityForViewer,
  useOpenpeeps,
} from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import {
  PostHeader,
  PostActions,
  FeedPostContent,
  PostReactionHeader,
  UnreadPostIndicator,
} from '../../pieces';
import React from 'react';
import { ThreadPost } from '../threaded/ThreadPost';
import { ThemedView } from '~/components/ui/themed-view';
import { usePostViewRef } from '~/hooks/use-post-view-ref';

interface FeedPostProps {
  post: PublicPost;
  accessible?: boolean;
  hideReply?: boolean;
  previewMode?: boolean;
  showMenu?: boolean;
  inGroup?: boolean;
  refetch?: () => void;
  showReplyTo?: boolean;
  showReactionHeader?: boolean;
}

export const FeedPost = ({
  post,
  hideReply,
  previewMode = false,
  showMenu = true,
  inGroup = false,
  showReplyTo = false,
  showReactionHeader = true,
}: FeedPostProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { currentProfile } = useOpenpeeps();

  const displayedPost = post.repost || post;
  const isUnread = isUnreadFeedActivityForViewer(post, currentProfile?.id);
  const postViewRef = usePostViewRef(post.id, {
    groupId: post.groupId,
    adjustUnread: isUnread,
  });

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
      {showReactionHeader && (
        <PostReactionHeader
          post={post}
          inGroup={inGroup}
          hideReply={hideReply}
          previewMode={previewMode}
        />
      )}
      {post.replyTo && showReplyTo ? (
        <ThreadPost
          post={post.replyTo as PublicPost}
          isParent={true}
          isChild={false}
          noActions={true}
          noMenu={true}
        />
      ) : null}

      <PostHeader
        post={displayedPost}
        showMenu={!post.repost && !post.inReplyToId && !previewMode && showMenu}
      />

      <ThemedView className="px-5">
        <FeedPostContent post={displayedPost} />
      </ThemedView>
      <PostActions
        post={displayedPost}
        previewMode={previewMode}
        onPostPress={handlePostPress}
      />
    </ThemedView>
  );
};
