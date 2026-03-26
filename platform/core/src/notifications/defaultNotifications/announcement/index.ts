import {
  type ExpandedNotification,
  type PostWithMeta,
  type NotificationHandler,
  notificationAll,
} from '@openpeeps/common/types';
import { listProfiles } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';

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
});

export default {
  type: 'announcement',
  event: 'postAnnounced',
  eventHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
