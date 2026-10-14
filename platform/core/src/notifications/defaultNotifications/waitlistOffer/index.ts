import {
  notificationAll,
  type ExpandedNotification,
  type NotificationHandler,
} from '@openpeepshq/common/types';
import {
  getProfileAvatar,
  isWaitlistOfferNotice,
  waitlistClaimPath,
} from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const eventHandler = async () => {};

const pushRenderer = async (notification: ExpandedNotification) => {
  const notice = isWaitlistOfferNotice(notification.data)
    ? notification.data
    : undefined;
  const eventName =
    notification.post?.data?.type === 'event'
      ? notification.post.data.name?.trim()
      : undefined;
  const path = notification.post
    ? waitlistClaimPath(notification.post.id, notice?.recurrenceId)
    : '/notifications';
  return {
    title: 'A spot opened',
    options: {
      body: eventName
        ? `Claim your spot at ${eventName}`
        : 'Claim your spot before the offer expires',
      icon: getProfileAvatar(
        notification.senderProfile ?? notification.post?.profile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:${path}`,
          title: 'Claim spot',
        },
      ],
    },
    invalidateQueries: [PUSH_INVALIDATE.posts],
  };
};

export default {
  type: 'waitlistOffer',
  // Created directly when a seat is offered. The handler exists for push/email.
  event: 'waitlistOffer',
  defaultSettings: notificationAll,
  eventHandler,
  pushRenderer,
} satisfies NotificationHandler;
