import type { ReactNode } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { cn } from '@openpeepshq/react-ui';
import { usePostViewRef } from '../../lib/postViewCounter';
import { useFeedPostPresentation } from '../../hooks/posts/useFeedPostPresentation';

import { FeedPostContent } from './FeedPostContent';
import { PostInfoHeader } from './pieces/PostInfoHeader';
import { PostReactionHeader } from './pieces/PostReactionHeader';
import { FeedPostStats } from './pieces/FeedPostStats';
import { PostActions } from './pieces/PostActions';
import { CompactReplyParent } from './CompactReplyParent';
import { UnreadPostIndicator } from './pieces/UnreadPostIndicator';
import { FeedThreadPreview } from './pieces/FeedThreadPreview';

export interface FeedPostProps {
  post: PublicPost;
  deleteCallback?: () => void;
  noReactionHeader?: boolean;
  inGroup?: boolean;
  showReplyTo?: boolean;
  /** Optional override for the body (used when threading). */
  content?: ReactNode;
  className?: string;
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
  className,
}: FeedPostProps) {
  const {
    displayedPost,
    isUnread,
    hasReactionHeader,
    showsReplyTo,
    showThreadPreview,
    hasStats,
    viewContext,
  } = useFeedPostPresentation(post, {
    noReactionHeader,
    inGroup,
    showReplyTo,
  });
  const postViewRef = usePostViewRef(post.id, viewContext);

  return (
    <article
      ref={postViewRef}
      className={cn(
        'bg-background border-border relative min-w-0 border-b p-4',
        className,
      )}
    >
      <UnreadPostIndicator show={isUnread} variant="corner" />
      {hasReactionHeader && (
        <PostReactionHeader
          post={post}
          inGroup={inGroup}
          deleteCallback={deleteCallback}
        />
      )}

      {showsReplyTo && displayedPost.replyTo && (
        <CompactReplyParent post={displayedPost.replyTo as PublicPost} />
      )}

      <div className="relative">
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
      {showThreadPreview ? <FeedThreadPreview post={displayedPost} /> : null}
    </article>
  );
}
