import type {
  PostWithMeta,
  NotificationHandler,
  PublicProfile,
} from '@openpeepshq/common/types';
import { findProfile } from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { getProfileAvatar, profileName } from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

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
      icon: getProfileAvatar(
        notification.senderProfile as PublicProfile,
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
} satisfies NotificationHandler;
