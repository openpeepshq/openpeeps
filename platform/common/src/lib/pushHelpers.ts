import type { PushSubscription, PushSubscriptionData } from '../types';

export const pushSubscriptionDeviceName = (
  subscription: PushSubscription,
): string | undefined =>
  'deviceName' in subscription ? subscription.deviceName : undefined;

/** Identity used to send a push. Duplicate keys mean duplicate notifications. */
export const pushSubscriptionDeliveryKey = (
  subscription: PushSubscriptionData,
): string => {
  switch (subscription.type) {
    case 'web':
      return `web:${subscription.endpoint}`;
    case 'webhook':
      return `webhook:${subscription.url}`;
    case 'apn':
      return `apn:${subscription.apnToken}`;
    case 'fcm':
      return `fcm:${subscription.fcmToken}`;
  }
};

export const pushSubscriptionEndpoint = (
  subscription: PushSubscription,
): string | undefined =>
  'endpoint' in subscription ? subscription.endpoint : undefined;

export const pushSubscriptionIsMobile = (
  subscription: PushSubscription,
): boolean =>
  pushSubscriptionDeviceName(subscription)
    ?.toLowerCase()
    .match(/phone|android|mobile|ios/) != null;
