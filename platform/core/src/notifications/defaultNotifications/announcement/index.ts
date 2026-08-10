import {
  type ExpandedNotification,
  type PostWithMeta,
  type NotificationHandler,
  notificationAll,
} from '@openpeepshq/common/types';
import { listProfiles } from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { getProfileAvatar, profileName } from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const eventHandler = async (data: unknown) => {
  const post = data as PostWithMeta;
  for (const recipientProfile of await listProfiles()) {
    if (post.profile.id !== recipientProfile?.id) {
      await maybeCreateNotification(recipientProfile, {
        type: 'announcement',
        postId: post.id,
        fromProfileId: post.profile.id,
      });
    }
  }
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `${profileName(notification.post?.profile)} posted an announcement`,
  options: {
    body: notification.post?.data?.content,
    icon: getProfileAvatar(notification.senderProfile, await communityConfig()),
    actions: [
      {
        action: `goto:/posts/${notification.post?.id}`,
        title: 'Go to announcement',
      },
    ],
  },
  invalidateQueries: [PUSH_INVALIDATE.posts],
});

export default {
  type: 'announcement',
  event: 'postAnnounced',
  eventHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
