import type {
  Profile,
  NotificationHandler,
  PostWithMeta,
  Reaction,
} from '@openpeeps/common/types';
import { findProfile } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

export default {
  type: 'reaction',
  event: 'reactionCreated',
  pushRenderer: async (notification) => ({
    title:
      profileName(notification.senderProfile!) +
      ' reacted with ' +
      (notification.data as { reaction: Reaction }).reaction +
      ' to your post',
    options: {
      body: notification.post?.data?.content,
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: 'Go to post',
        },
      ],
    },
    invalidateQueries: [PUSH_INVALIDATE.posts],
  }),
  eventHandler: async (...eventData) => {
    const [profile, post, data] = eventData as [
      Profile,
      PostWithMeta,
      Reaction,
    ];
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
  },
} satisfies NotificationHandler;
