import type { PostWithMeta } from '@openpeepshq/common/types';

/**
 * Parent author already gets a reply notification for this post.
 * Event replies and direct posts do not create one, so they still
 * receive the group notification.
 */
const replyNotificationRecipientId = (
  post: PostWithMeta,
): string | undefined => {
  if (post.data?.type === 'event' || post.visibility === 'direct') {
    return undefined;
  }
  if (!post.inReplyToId) {
    return undefined;
  }
  const parentAuthorId = post.replyTo?.profile?.id ?? post.replyTo?.creatorId;
  if (!parentAuthorId || parentAuthorId === post.profile.id) {
    return undefined;
  }
  return parentAuthorId;
};

/** Group members to notify. Skips the author and anyone already notified of the reply. */
export const newGroupPostRecipients = <T extends { id: string }>(
  post: PostWithMeta,
  members: T[],
): T[] => {
  const parentAuthorId = replyNotificationRecipientId(post);

  return members.filter(
    (member) => member.id !== post.profile.id && member.id !== parentAuthorId,
  );
};
