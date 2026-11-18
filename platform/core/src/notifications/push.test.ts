import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  db: { __brand: 'db' },
  subscriptions: [] as Array<Record<string, unknown>>,
  deleted: [] as string[],
  sendEachForMulticast: vi.fn(),
  sendWebPushNotification: vi.fn(),
  fetch: vi.fn(),
}));

const account = { id: 'acc-1', email: 'a@b.c' };
const notification = {
  title: 'Hello',
  options: { badge: '1', data: {} },
} as never;
const stats = { unread: 0, unseen: 0 };

const pushSubscription = (
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  ...overrides,
});

vi.mock('./helpers', async () => ({
  defaultNotificationTypes: [],
}));

vi.mock('./finders', async () => ({
  getNotificationStats: async () => ({ unread: 0, unseen: 0 }),
}));

vi.mock('@openpeepshq/core/profiles', () => ({
  listProfiles: async () => [],
}));

vi.mock('@openpeepshq/core/notifications', () => ({
  maybeCreateNotification: async () => null,
}));

vi.mock('../db', async () => ({
  allpeepDb: vi.fn(async () => ({ db: testState.db })),
}));

vi.mock('../jwt', () => ({
  jwtUtil: async () => ({ sign: async () => 'test-token' }),
}));

vi.mock('../pushSubscriptions', async () => ({
  deletePushSubscription: async (id: string) => {
    testState.deleted.push(id);
  },
  listPushSubscriptionsByAccount: async () => testState.subscriptions as never,
}));

vi.mock('../config', () => ({
  config: async () => ({ vapid: { privateKey: 'k', publicKey: 'p' } }),
  communityConfig: async () => ({ info: { contactEmail: 'a@b.c' } }),
}));

vi.mock('web-push', () => ({
  default: { sendNotification: testState.sendWebPushNotification },
}));

vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEachForMulticast: testState.sendEachForMulticast,
  }),
}));

const { doPush, sendTestPushNotification } = await import('./push');

describe('doPush dead FCM token cleanup', () => {
  beforeEach(() => {
    testState.subscriptions = [];
    testState.deleted = [];
    testState.sendEachForMulticast.mockReset();
    testState.sendWebPushNotification.mockReset();
  });

  const runFcmPush = async () => doPush(notification, stats, account as never);

  const runWebPush = async () => doPush(notification, stats, account as never);

  it('removes subscriptions rejected as unregistered', async () => {
    testState.subscriptions = [
      pushSubscription('sub-1', { type: 'fcm', fcmToken: 'dead' }),
    ];
    testState.sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });

    await runFcmPush();

    expect(testState.sendEachForMulticast).toHaveBeenCalled();
    expect(testState.deleted).toEqual(['sub-1']);
  });

  it('removes subscriptions rejected as UNREGISTERED (v1 code normalization)', async () => {
    // firebase-admin maps the raw FCM v1 code NOT_FOUND/UNREGISTERED family to
    // UPPERCASE client codes; deletion must not depend on the lowercase form.
    testState.subscriptions = [
      pushSubscription('sub-1', { type: 'fcm', fcmToken: 'dead' }),
    ];
    testState.sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: { code: 'messaging/REGISTRATION-TOKEN-NOT-REGISTERED' },
        },
      ],
    });

    await runFcmPush();

    expect(testState.deleted).toEqual(['sub-1']);
  });

  it('keeps subscriptions rejected for payload problems (invalid-argument)', async () => {
    // INVALID_ARGUMENT also fires for request-level problems (bad data keys,
    // size limits) while the token is still live; deleting here would drop
    // valid subscriptions on one bad payload with no re-registration path.
    testState.subscriptions = [
      pushSubscription('sub-2', { type: 'fcm', fcmToken: 'bad' }),
    ];
    testState.sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        { success: false, error: { code: 'messaging/invalid-argument' } },
      ],
    });

    await runFcmPush();

    expect(testState.deleted).toEqual([]);
  });

  it('keeps subscriptions with transient errors', async () => {
    testState.subscriptions = [
      pushSubscription('sub-3', { type: 'fcm', fcmToken: 'alive' }),
    ];
    testState.sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [{ success: false, error: { code: 'messaging/unavailable' } }],
    });

    await runFcmPush();

    expect(testState.deleted).toEqual([]);
  });

  it('keeps subscriptions that were delivered', async () => {
    testState.subscriptions = [
      pushSubscription('sub-4', { type: 'fcm', fcmToken: 'good' }),
    ];
    testState.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await runFcmPush();

    expect(testState.deleted).toEqual([]);
  });

  describe('doPush dead web push cleanup', () => {
    it('removes subscriptions rejected with 404/410', async () => {
      testState.subscriptions = [
        pushSubscription('web-1', {
          type: 'web',
          endpoint: 'https://push.example/1',
        }),
      ];
      testState.sendWebPushNotification.mockRejectedValue({
        statusCode: 410,
      });

      await runWebPush();

      expect(testState.deleted).toEqual(['web-1']);
    });

    it('keeps subscriptions when the push endpoint rejects with 403 or 429', async () => {
      // Operator-side problems (VAPID misconfig, rate limiting) must not wipe
      // every subscription of the account in one bad deploy.
      testState.subscriptions = [
        pushSubscription('web-2', {
          type: 'web',
          endpoint: 'https://push.example/2',
        }),
      ];
      testState.sendWebPushNotification.mockRejectedValue({ statusCode: 403 });

      await runWebPush();

      expect(testState.deleted).toEqual([]);

      testState.sendWebPushNotification.mockRejectedValue({ statusCode: 429 });
      await runWebPush();

      expect(testState.deleted).toEqual([]);
    });

    it('keeps subscriptions when the push request fails without a status (network error)', async () => {
      testState.subscriptions = [
        pushSubscription('web-3', {
          type: 'web',
          endpoint: 'https://push.example/3',
        }),
      ];
      testState.sendWebPushNotification.mockRejectedValue(
        new Error('socket hang up'),
      );

      await runWebPush();

      expect(testState.deleted).toEqual([]);
    });

    it('keeps subscriptions when the push request resolves', async () => {
      // web-push resolves only for 2xx/3xx; a resolved send is never a dead
      // endpoint, so nothing may be deleted on this path.
      testState.subscriptions = [
        pushSubscription('web-4', {
          type: 'web',
          endpoint: 'https://push.example/4',
        }),
      ];
      testState.sendWebPushNotification.mockResolvedValue({ statusCode: 201 });

      await runWebPush();

      expect(testState.deleted).toEqual([]);
    });
  });
});

describe('sendTestPushNotification dead web push cleanup', () => {
  beforeEach(() => {
    testState.deleted = [];
    testState.sendWebPushNotification.mockReset();
  });

  const profile = { id: 'p-1' } as never;
  const subscriptionKey = 'auth-key-1';

  const withWebSub = (id: string) => {
    testState.subscriptions = [
      pushSubscription(id, {
        type: 'web',
        endpoint: 'https://push.example/t',
        keys: { auth: subscriptionKey },
      }),
    ];
  };

  // A failing test push surfaces as a rejected promise (the send rethrows);
  // assert rejection and then inspect which rows were deleted.
  const runTestPush = () =>
    expect(
      sendTestPushNotification(account, profile, subscriptionKey),
    ).rejects.toBeDefined();

  it('removes the subscription when the push endpoint rejects with 404/410', async () => {
    withWebSub('web-t1');
    testState.sendWebPushNotification.mockRejectedValue({ statusCode: 404 });
    await runTestPush();
    expect(testState.deleted).toEqual(['web-t1']);

    testState.deleted = [];
    withWebSub('web-t2');
    testState.sendWebPushNotification.mockRejectedValue({ statusCode: 410 });
    await runTestPush();
    expect(testState.deleted).toEqual(['web-t2']);
  });

  it('keeps the subscription on transient 403/429 failures', async () => {
    withWebSub('web-t3');
    testState.sendWebPushNotification.mockRejectedValue({ statusCode: 403 });
    await runTestPush();
    expect(testState.deleted).toEqual([]);

    testState.deleted = [];
    withWebSub('web-t4');
    testState.sendWebPushNotification.mockRejectedValue({ statusCode: 429 });
    await runTestPush();
    expect(testState.deleted).toEqual([]);
  });

  it('keeps the subscription on a status-less network error', async () => {
    withWebSub('web-t5');
    testState.sendWebPushNotification.mockRejectedValue(
      new Error('socket hang up'),
    );
    await runTestPush();
    expect(testState.deleted).toEqual([]);
  });

  it('keeps the subscription when the push resolves', async () => {
    withWebSub('web-t6');
    testState.sendWebPushNotification.mockResolvedValue({ statusCode: 201 });
    await sendTestPushNotification(account, profile, subscriptionKey);
    expect(testState.deleted).toEqual([]);
  });
});

describe('sendTestPushNotification dead webhook push cleanup', () => {
  const profile = { id: 'p-1' } as never;
  const subscriptionKey = 'https://hook.example/1';

  beforeEach(() => {
    testState.deleted = [];
    vi.stubGlobal('fetch', testState.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    testState.fetch.mockReset();
  });

  const withWebhookSub = (id: string) => {
    testState.subscriptions = [
      pushSubscription(id, {
        type: 'webhook',
        url: subscriptionKey,
      }),
    ];
  };

  const runTestPush = () =>
    expect(
      sendTestPushNotification(account, profile, subscriptionKey),
    ).rejects.toBeDefined();

  const responseWith = (status: number) =>
    ({ ok: status < 400, status }) as Response;

  it('removes the subscription when the webhook rejects with 404/410', async () => {
    withWebhookSub('hook-1');
    testState.fetch.mockResolvedValueOnce(responseWith(404));
    await runTestPush();
    expect(testState.deleted).toEqual(['hook-1']);

    testState.deleted = [];
    withWebhookSub('hook-2');
    testState.fetch.mockResolvedValueOnce(responseWith(410));
    await runTestPush();
    expect(testState.deleted).toEqual(['hook-2']);
  });

  it('keeps the subscription on transient 5xx failures', async () => {
    withWebhookSub('hook-3');
    testState.fetch.mockResolvedValueOnce(responseWith(500));
    await runTestPush();
    expect(testState.deleted).toEqual([]);

    testState.deleted = [];
    withWebhookSub('hook-4');
    testState.fetch.mockResolvedValueOnce(responseWith(429));
    await runTestPush();
    expect(testState.deleted).toEqual([]);
  });

  it('keeps the subscription on a network error', async () => {
    withWebhookSub('hook-5');
    testState.fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await runTestPush();
    expect(testState.deleted).toEqual([]);
  });

  it('keeps the subscription when the webhook resolves', async () => {
    withWebhookSub('hook-6');
    testState.fetch.mockResolvedValueOnce(responseWith(200));
    await sendTestPushNotification(account, profile, subscriptionKey);
    expect(testState.deleted).toEqual([]);
  });
});
