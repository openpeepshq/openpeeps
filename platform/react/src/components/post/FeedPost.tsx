import type { ReactNode } from 'react';
import type { PublicPost } from '@openpeeps/common/types';

import { FeedPostContent } from './FeedPostContent';
import { PostInfoHeader } from './pieces/PostInfoHeader';
import { PostReactionHeader } from './pieces/PostReactionHeader';
import { FeedPostStats } from './pieces/FeedPostStats';
import { PostActions } from './pieces/PostActions';

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
 * Single post card for the chronological feed. Mirrors `FeedPost.svelte`:
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
  const hasReactionHeader =
    !noReactionHeader &&
    (!!post.repost || !!post.inReplyToId || (!!post.groupId && !inGroup));

  const displayedPost: PublicPost = post.repost ?? post;
  const hasStats = !!(
    displayedPost?.repostCount ||
    displayedPost?.reactions?.length ||
    displayedPost?.replyCount
  );

  return (
    <div className="border-b p-4">
      {hasReactionHeader && (
        <PostReactionHeader post={post} inGroup={inGroup} />
      )}

      {displayedPost.replyTo && showReplyTo && (
        <a
          href={`/posts/${displayedPost.replyTo.id}`}
          className="block rounded-md border border-border/60 p-2 text-sm opacity-80 hover:opacity-100"
        >
          <PostInfoHeader post={displayedPost.replyTo} />
        </a>
      )}

      <div>
        <PostInfoHeader
          post={displayedPost}
          showMenu={!hasReactionHeader}
          deleteCallback={deleteCallback}
        />
        <div className="pb-2">
          {content ?? <FeedPostContent post={displayedPost} />}
        </div>
        {hasStats && <FeedPostStats post={displayedPost} />}
      </div>

      <PostActions post={displayedPost} />
    </div>
  );
}
