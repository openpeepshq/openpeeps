import { buildEventIcs } from '@openpeepshq/common/lib';
import type {
  EmailAttachment,
  ExpandedNotification,
  PublicPost,
} from '@openpeepshq/common/types';

const isEventPost = (
  post: { type: string; data?: { type?: string } | null } | null | undefined,
): boolean => post?.type === 'event' && post.data?.type === 'event';

/** The event this notification is about: the post itself, or the post it reposts. */
const eventPostOf = (
  notification: ExpandedNotification,
): PublicPost | undefined => {
  const post = notification.post;
  if (!post) return undefined;
  if (isEventPost(post)) return post as unknown as PublicPost;
  if (isEventPost(post.repost)) return post.repost as unknown as PublicPost;
  return undefined;
};

/**
 * Calendar file so a notification email about an event can be added to a
 * calendar. Non-event notifications return undefined.
 */
export const eventIcsEmailAttachment = (
  notification: ExpandedNotification,
  rootUrl: string,
): EmailAttachment | undefined => {
  const post = eventPostOf(notification);
  if (!post) return undefined;

  const ics = buildEventIcs(post, {
    postUrl: `${rootUrl}/posts/${post.id}`,
  });
  if (!ics) return undefined;

  return {
    filename: 'event.ics',
    content: ics,
    contentType: 'text/calendar; method=PUBLISH; charset=utf-8',
  };
};
