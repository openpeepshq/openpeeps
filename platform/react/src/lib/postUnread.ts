import type { PublicPost } from '@openpeepshq/common/types';

export const isUnreadPostForViewer = (
  post: PublicPost,
  viewerId?: string,
): boolean =>
  post.seen === false && !!viewerId && post.profile.id !== viewerId;
