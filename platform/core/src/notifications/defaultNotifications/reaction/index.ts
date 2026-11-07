import type {
  Profile,
  NotificationHandler,
  PostWithMeta,
  Reaction,
  ExpandedNotification,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { findProfile } from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { getProfileAvatar, profileName } from '@openpeepshq/common/lib';
import { getConversationByEnd } from '@openpeepshq/core/posts';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const pushRenderer = async (notification: ExpandedNotification) => {
  const reaction = (notification.data as { reaction: Reaction }).reaction;
  const direct = notification.post?.visibility === 'direct';
  const path = direct
    ? `/conversations/${
        (notification.data as { conversationStart?: PostWithMeta })
          .conversationStart?.id
      }`
    : `/posts/${notification.post?.id}`;

  return {
    title:
      profileName(notification.senderProfile!) +
      ' reacted with ' +
      reaction +
      (direct ? ' to your message' : ' to your post'),
    options: {
      // DM content is never previewed in notifications.
      body: direct ? undefined : notification.post?.data?.content,
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      data: { url: path },
      actions: [
        {
          action: `goto:${path}`,
          title: direct ? 'Go to thread' : 'Go to post',
        },
      ],
    },
    // DM threads are cached under `conversations` keys; feed posts only
    // need `posts` invalidated.
    invalidateQueries: [
      PUSH_INVALIDATE.posts,
      ...(direct ? [PUSH_INVALIDATE.conversations] : []),
    ],
  };
};

const expander = async (notification: ExpandedNotification) => {
  const post = notification.post;
  if (!post || post.visibility !== 'direct') return notification;
  const conversationStart = (
    await getConversationByEnd(post, {
      profile: notification.recipientProfile as ProfileWithMeta,
      scopes: [],
    })
  )[0];
  return {
    ...notification,
    data: {
      ...(notification.data as Record<string, unknown>),
      conversationStart,
    },
  } as ExpandedNotification;
};

const eventHandler = async (...eventData: unknown[]) => {
  const [profile, post, data] = eventData as [Profile, PostWithMeta, Reaction];
  const recipientProfile = await findProfile(post.profile.id);

  if (recipientProfile && recipientProfile?.id !== profile.id) {
    await maybeCreateNotification(recipientProfile, {
      type: 'reaction',
      fromProfileId: profile.id,
      postId: post.id,
      data: {
        reaction: data.reaction,
      },
    });
  }
};

export default {
  type: 'reaction',
  event: 'reactionCreated',
  pushRenderer,
  expander,
  eventHandler,
} satisfies NotificationHandler;
