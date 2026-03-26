import {
  type ExpandedNotification,
  type PostWithMeta,
  type NotificationHandler,
  type ProfileWithMeta,
  notificationAll,
} from '@openpeeps/common/types';
import {
  maybeCreateNotification,
} from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { getConversationByEnd } from '@openpeeps/core/posts';
import { communityConfig } from '../../../config';

const eventHandler = async (data: unknown) => {
  const post = data as PostWithMeta;

  if (post.data?.type === 'event') return;

  if (post.visibility === 'direct' && post.audience) {
    for (const recipientProfile of post.audience) {
      if (post.profile.id !== recipientProfile.id) {
        await maybeCreateNotification(recipientProfile, {
          type: 'directMessage',
          fromProfileId: post.profile.id,
          postId: post.id,
        });
      }
    }
  }
};

const pushRenderer = async (notification: ExpandedNotification) => {
  const path = `/conversations/${(notification.data as { conversationStart: PostWithMeta }).conversationStart?.id}`;

  return {
    title: `${profileName(notification.senderProfile!)} sent you a direct message`,
    options: {
      body: notification.post?.data?.content,
      icon: getProfileAvatar(notification.senderProfile, await communityConfig()),
      data: {
        url: path
      },
      actions: [
        {
          action: `goto:${path}`,
          title: 'Go to thread',
        },
      ],
    },
  };
};

const expander = async (notification: ExpandedNotification) => {

  const { post, recipientProfile } = notification;
  const previousPost = post?.replyTo;
  const conversationStart =
    post &&
    recipientProfile &&
    (
      await getConversationByEnd(
        post,
        recipientProfile as ProfileWithMeta,
      )
    )[0];
  return {
    ...notification,
    data: {
      conversationStart,
      previousPost,
    },
  } as ExpandedNotification;
};

export default {
  type: 'directMessage',
  event: 'postCreated',
  eventHandler,
  expander,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
