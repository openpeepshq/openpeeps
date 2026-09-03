import type { ReactNode } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { cn } from '@openpeepshq/react-ui';
import { usePostViewRef } from '../../lib/postViewCounter';
import { isUnreadFeedActivityForViewer } from '../../lib/postUnread';
import { useCurrentProfile } from '../layout/IdentityContext';

import { FeedPostContent } from './FeedPostContent';
import { PostInfoHeader } from './pieces/PostInfoHeader';
import { PostReactionHeader } from './pieces/PostReactionHeader';
import { FeedPostStats } from './pieces/FeedPostStats';
import { PostActions } from './pieces/PostActions';
import { ThreadPost } from './feed/threaded/ThreadPost';
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
  const me = useCurrentProfile();
  const displayedPost: PublicPost = post.repost ?? post;
  const isUnread = isUnreadFeedActivityForViewer(post, me?.id);
  const postViewRef = usePostViewRef(post.id, {
    groupId: post.groupId,
    adjustUnread: isUnread,
  });
  const hasReactionHeader =
    !noReactionHeader &&
    (!!post.repost || !!post.inReplyToId || (!!post.groupId && !inGroup));

  const showsReplyTo = !!(showReplyTo && displayedPost.replyTo);
  const showThreadPreview =
    !showsReplyTo &&
    !displayedPost.inReplyToId &&
    ((displayedPost.latestReplies?.length ?? 0) > 0 ||
      (displayedPost.replyCount ?? 0) > 0);

  const hasStats = !!(
    displayedPost?.repostCount ||
    displayedPost?.reactions?.length ||
    displayedPost?.replyCount
  );

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
        // ThreadPost carries its own `p-2`, so pull it back to line its avatar
        // and rail up with this post's avatar.
        <a href={`/posts/${displayedPost.replyTo.id}`} className="-ml-2 block">
          <ThreadPost
            post={displayedPost.replyTo as PublicPost}
            isParent
            noActions
            noMenu
          />
        </a>
      )}

      <div className="relative">
        {/* Carries the reply preview's rail across the header's `py-2` down to
            this post's avatar. */}
        {showsReplyTo && (
          <div className="bg-border-2 pointer-events-none absolute left-6 top-0 h-2 w-px" />
        )}
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
