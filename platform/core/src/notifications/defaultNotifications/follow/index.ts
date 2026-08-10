import {
  ExpandedNotification,
  NotificationHandler,
  PublicProfile,
  notificationAll,
} from '@openpeepshq/common/types';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import {
  getProfileAvatar,
  profileName,
  truncateText,
} from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

export default {
  type: 'follow',
  event: 'followCreated',
  defaultSettings: notificationAll,
  eventHandler: (follower: unknown, followed: unknown) =>
    maybeCreateNotification(followed as PublicProfile, {
      type: 'follow',
      fromProfileId: (follower as PublicProfile).id,
    }),
  pushRenderer: async (notification: ExpandedNotification) => ({
    title: `${profileName(notification.senderProfile!)} followed you`,
    options: {
      body: truncateText(notification.senderProfile?.bio),
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/@${notification.senderProfile?.handle}`,
          title: 'View Profile',
        },
      ],
    },
    invalidateQueries: [PUSH_INVALIDATE.profiles],
  }),
} satisfies NotificationHandler;
