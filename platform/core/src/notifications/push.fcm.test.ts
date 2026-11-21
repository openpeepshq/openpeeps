import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Account,
  NotificationStats,
  PushNotification,
  PushSubscription,
} from '@openpeepshq/common/types';

const {
  getApps,
  sendEachForMulticast,
  config,
  communityConfig,
  listPushSubscriptionsByAccount,
  deletePushSubscription,
  logStep,
  logFailure,
  messaging,
  getMessagingSpy,
} = vi.hoisted(() => {
  const sendEachForMulticast = vi.fn();
  // firebase-admin caches the Messaging instance: getMessaging() returns the
  // same object on every call and never re-initializes, even when push code
  // runs many times in one process. The mock mirrors that so the suite can
  // pin the intended lifetime semantics.
  const messaging = {
    sendEachForMulticast: (...args: unknown[]) => sendEachForMulticast(...args),
  };
  const getMessagingSpy = vi.fn(() => messaging);
  return {
    getApps: vi.fn(),
    sendEachForMulticast,
    config: vi.fn(),
    communityConfig: vi.fn(),
    listPushSubscriptionsByAccount: vi.fn(),
    deletePushSubscription: vi.fn(),
    logStep: vi.fn(),
    logFailure: vi.fn(),
    messaging,
    getMessagingSpy,
  };
});

vi.mock('../jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../jobs')>()),
  logStep: (...args: unknown[]) => logStep(...args),
  logFailure: (...args: unknown[]) => logFailure(...args),
}));
vi.mock('firebase-admin/app', () => ({
  getApps: () => getApps(),
}));
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => getMessagingSpy(),
}));
vi.mock('../config', () => ({
  config: () => config(),
  communityConfig: () => communityConfig(),
}));
vi.mock('../pushSubscriptions', () => ({
  listPushSubscriptionsByAccount: () => listPushSubscriptionsByAccount(),
  deletePushSubscription: () => deletePushSubscription(),
}));
vi.mock('web-push', () => ({ default: { sendNotification: vi.fn() } }));
vi.mock('apns2', () => ({
  ApnsClient: class {},
  Notification: class {},
}));
vi.mock('../jwt', () => ({ jwtUtil: vi.fn() }));

import { doPush } from './push';

const serviceAccount = {
  client_email: 'fcm-sender@test-project.iam.gserviceaccount.com',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEA\n-----END PRIVATE KEY-----\n',
  project_id: 'test-project',
};

const account = { id: 'account-1', email: 'pusher@example.com' } as Account;

const notificationStats: NotificationStats = { unread: 1, unseen: 2 };

const notification: PushNotification = {
  title: 'New comment',
  options: {
    body: 'A note on your post',
    badge: 3,
    data: { postId: 'post-1' },
  },
};

const fcmSubscription = (id: string, fcmToken: string) =>
  ({
    id,
    type: 'fcm',
    fcmToken,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  }) as unknown as PushSubscription;

// The exact FCM wire payload pre-v14 push.ts sent to FCM — the regression
// guard: the firebase-admin 13 -> 14 modular migration must not change what
// goes on the wire (tokens + data.payload + the apns block).
const expectedMulticastMessage = {
  tokens: ['token-a', 'token-b'],
  data: {
    payload: JSON.stringify({ notification, notificationStats }),
  },
  apns: {
    payload: {
      aps: {
        contentAvailable: true,
        priority: 'high',
        alert: 'New comment',
        badge: 3,
        data: { postId: 'post-1' },
      },
    },
  },
};

describe('FCM push delivery (firebase-admin v14 modular API)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.mockResolvedValue({
      apps: { android: { fcmCredentials: JSON.stringify(serviceAccount) } },
    });
    communityConfig.mockResolvedValue({
      info: { contactEmail: 'ops@example.com' },
    });
    listPushSubscriptionsByAccount.mockResolvedValue([
      fcmSubscription('fcm-sub-1', 'token-a'),
      fcmSubscription('fcm-sub-2', 'token-b'),
    ]);
    deletePushSubscription.mockResolvedValue(undefined);
    getApps.mockReturnValue([{ name: '[DEFAULT]' }]);
    sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
      ],
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('sends the same multicast payload shape as pre-v14 (tokens + data.payload + apns)', async () => {
    await doPush(notification, notificationStats, account);

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast).toHaveBeenCalledWith(expectedMulticastMessage);
  });

  it('does not call FCM when firebase-admin has no initialized app', async () => {
    getApps.mockReturnValue([]);

    await doPush(notification, notificationStats, account);

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  // v13 -> v14 overhauled the error surface (firebase#3140): batch failures
  // now arrive as per-response `error` objects instead of v13's thrown
  // messaging errors. The handler must keep reading them off `response.error`
  // — pin that the failure path formats the per-response error verbatim and
  // does not depend on any v13-specific error class.
  it('logs each failed token with its per-response error from sendEachForMulticast', async () => {
    const fcmError = new Error('The requested entity was not found.');
    sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true, messageId: 'msg-1' },
        { success: false, error: fcmError },
      ],
    });

    await doPush(notification, notificationStats, account);

    expect(logFailure).toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.stringContaining('fcm sub=fcm-sub-2'),
      fcmError,
    );
    expect(logFailure).not.toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.stringContaining('fcm sub=fcm-sub-1'),
      expect.anything(),
    );
    expect(logStep).toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.stringContaining('1 delivered, 1 failed'),
    );
  });

  it('logs all tokens as failed when sendEachForMulticast throws (no per-response errors)', async () => {
    const transportError = new Error('grpc connection refused');
    sendEachForMulticast.mockRejectedValue(transportError);

    await doPush(notification, notificationStats, account);

    expect(logFailure).toHaveBeenCalledTimes(2);
    expect(logFailure).toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.stringContaining('fcm sub=fcm-sub-1'),
      transportError,
    );
    expect(logFailure).toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.stringContaining('fcm sub=fcm-sub-2'),
      transportError,
    );
    expect(logStep).not.toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.stringContaining('delivered'),
    );
  });

  // sendAppFCMPushNotifications can run many times per process (one call per
  // doPush, and doPush runs per notification). Pin firebase-admin's intended
  // lifetime: getMessaging() hands back the same cached instance on every
  // call and never re-initializes, instead of the mock's former
  // toHaveBeenCalledTimes(1) cap, which was stricter than the runtime
  // contract and could silently pass with a per-call instance.
  it('reuses the same messaging instance across sends without re-initializing', async () => {
    await doPush(notification, notificationStats, account);
    await doPush(notification, notificationStats, account);

    expect(getMessagingSpy).toHaveBeenCalledTimes(2);
    expect(getMessagingSpy.mock.results).toHaveLength(2);
    expect(getMessagingSpy.mock.results[0]?.value).toBe(messaging);
    expect(getMessagingSpy.mock.results[1]?.value).toBe(messaging);
    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
  });
});
