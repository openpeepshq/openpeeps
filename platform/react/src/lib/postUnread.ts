import type { PublicPost } from '@openpeepshq/common/types';

export const isUnreadPostForViewer = (
  post: PublicPost,
  viewerId?: string,
): boolean => post.seen === false && !!viewerId && post.profile.id !== viewerId;

/**
 * Unseen SQL counts the feed row (`post.id`). For a repost that is the
 * wrapper, not the nested original — viewing the original elsewhere must
 * not clear the wrapper, and mark-seen must write `post_seen` for the
 * wrapper.
 */
export const isUnreadFeedActivityForViewer = (
  post: PublicPost,
  viewerId?: string,
): boolean => isUnreadPostForViewer(post, viewerId);
