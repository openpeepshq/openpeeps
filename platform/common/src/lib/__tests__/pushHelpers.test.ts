import { describe, expect, it } from 'vitest';
import { pushSubscriptionDeliveryKey } from '../pushHelpers';

describe('pushSubscriptionDeliveryKey', () => {
  it('keys FCM subscriptions by token', () => {
    expect(
      pushSubscriptionDeliveryKey({
        type: 'fcm',
        fcmToken: 'token-a',
      }),
    ).toBe('fcm:token-a');
  });

  it('treats the same FCM token as the same delivery target', () => {
    expect(
      pushSubscriptionDeliveryKey({
        type: 'fcm',
        fcmToken: 'token-a',
        deviceName: 'phone 1',
      }),
    ).toBe(
      pushSubscriptionDeliveryKey({
        type: 'fcm',
        fcmToken: 'token-a',
        deviceName: 'phone 2',
      }),
    );
  });
});
