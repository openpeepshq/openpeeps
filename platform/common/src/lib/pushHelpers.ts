import type { PushSubscription } from '../types';

export const pushSubscriptionDeviceName = (
  subscription: PushSubscription,
): string | undefined =>
  'deviceName' in subscription ? subscription.deviceName : undefined;

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
