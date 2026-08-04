import type { ReactNode, RefObject } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { usePostViewRef } from '../../lib/postViewCounter';
import { isUnreadPostForViewer } from '../../lib/postUnread';
import { useCurrentProfile } from '../layout/IdentityContext';

import { FeedPostContent } from './FeedPostContent';
import { PostInfoHeader } from './pieces/PostInfoHeader';
import { PostReactionHeader } from './pieces/PostReactionHeader';
import { FeedPostStats } from './pieces/FeedPostStats';
import { PostActions } from './pieces/PostActions';
import { ThreadPost } from './feed/threaded/ThreadPost';
import { UnreadPostIndicator } from './pieces/UnreadPostIndicator';

export interface FeedPostProps {
  post: PublicPost;
  deleteCallback?: () => void;
  noReactionHeader?: boolean;
  inGroup?: boolean;
  showReplyTo?: boolean;
  /** Optional override for the body (used when threading). */
  content?: ReactNode;
}

/**
 * Single post card for the chronological feed:
 * shows a small reaction/reply/group banner, the author header, the body,
 * stats and actions. The body component dispatches on `post.type`.
 */
export function FeedPost({
  post,
  deleteCallback,
  noReactionHeader = false,
  inGroup = false,
  showReplyTo = false,
  content,
}: FeedPostProps) {
  const me = useCurrentProfile();
  const displayedPost: PublicPost = post.repost ?? post;
  const isUnread = isUnreadPostForViewer(displayedPost, me?.id);
  const postViewRef = usePostViewRef(displayedPost.id, {
    groupId: displayedPost.groupId,
    adjustUnread: isUnread,
  }) as RefObject<HTMLDivElement>;
  const hasReactionHeader =
    !noReactionHeader &&
    (!!post.repost || !!post.inReplyToId || (!!post.groupId && !inGroup));

  const hasStats = !!(
    displayedPost?.repostCount ||
    displayedPost?.reactions?.length ||
    displayedPost?.replyCount
  );

  return (
    <div
      ref={postViewRef}
      className="bg-background border-border relative min-w-0 border-b p-4"
    >
      <UnreadPostIndicator show={isUnread} />
      {hasReactionHeader && (
        <PostReactionHeader
          post={post}
          inGroup={inGroup}
          deleteCallback={deleteCallback}
        />
      )}

      {displayedPost.replyTo && showReplyTo && (
        <a href={`/posts/${displayedPost.replyTo.id}`}>
          <ThreadPost
            post={displayedPost.replyTo as PublicPost}
            isParent
            noActions
            noMenu
          />
        </a>
      )}

      <div>
        <PostInfoHeader
          post={displayedPost}
          showMenu={!hasReactionHeader}
          deleteCallback={deleteCallback}
        />
        <div className="min-w-0 pb-2">
          {content ?? <FeedPostContent post={displayedPost} />}
        </div>
        {hasStats && <FeedPostStats post={displayedPost} />}
      </div>

      <PostActions post={displayedPost} />
    </div>
  );
}
