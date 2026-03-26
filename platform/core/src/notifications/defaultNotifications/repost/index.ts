import type { PostWithMeta, NotificationHandler, PublicProfile } from '@openpeeps/common/types';
import { findProfile } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';

export default {
  type: 'repost',
  event: 'postCreated',
  eventHandler: async (data: unknown) => {
    const post = data as PostWithMeta;

    if (post.data?.type === 'event') return;

    if (post.repost) {
      const recipientProfile = await findProfile(post.repost.profile.id);

      if (recipientProfile && recipientProfile?.id !== post.profile.id) {
        await maybeCreateNotification(recipientProfile, {
          type: 'repost',
          postId: post.repost.id,
          fromProfileId: post.profile.id,
        });
      }
    }
  },
  pushRenderer: async (notification) => ({
    title: `${profileName(notification.senderProfile!)} reposted your post`,
    options: {
      body: notification.post?.data?.content,
      icon: getProfileAvatar(notification.senderProfile as PublicProfile, await communityConfig()),
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: 'Go to post',
        },
      ],
    },
  }),
} satisfies NotificationHandler;
