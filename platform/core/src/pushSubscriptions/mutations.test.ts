import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  db: { __brand: 'db' },
  findAccountResult: undefined as
    | { id: string }
    | undefined
    | Promise<undefined>,
  findPushResult: undefined as { id: string } | undefined,
  created: undefined as { id: string } | undefined,
  filterArgs: [] as Array<Record<string, unknown>>,
  disconnect: vi.fn(),
  connect: vi.fn(),
}));

const account = { id: 'acc-1' };
const subscription = { id: 'sub-1', type: 'fcm', fcmToken: 'tok-1' };

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({ db: testState.db })),
}));

vi.mock('./mapping', () => {
  return {
    pushSubscriptionsMapping: {
      filter: (arg: Record<string, unknown>) => {
        testState.filterArgs.push(arg);
        return {
          first: async () => testState.findPushResult,
        };
      },
      create: async () => {
        testState.created = { id: 'sub-new' };
        return testState.created;
      },
    },
  };
});

vi.mock('./helpers', () => ({
  pushSubscriptionAccountConnector: testState.connect,
  pushSubscriptionAccountDisconnector: testState.disconnect,
}));

vi.mock('./finders', () => ({
  findAccountForPushSubscription: async () => testState.findAccountResult,
}));

vi.mock('../accounts/mapping', () => ({
  accountsMapping: {},
  pushSubscriptionsRelation: {},
}));

const { createPushSubscription } = await import('./mutations');

describe('createPushSubscription relink guard', () => {
  beforeEach(() => {
    testState.findPushResult = undefined;
    testState.findAccountResult = undefined;
    testState.created = undefined;
    testState.connect.mockClear();
    testState.disconnect.mockClear();
  });

  it('re-links an existing subscription to the new account', async () => {
    testState.findPushResult = subscription;
    testState.findAccountResult = { id: 'acc-old' };

    const result = await createPushSubscription(account, {
      type: 'fcm',
      fcmToken: 'tok-1',
    });

    expect(result).toBe(subscription);
    expect(testState.disconnect).toHaveBeenCalledWith(
      testState.db,
      { id: 'acc-old' },
      subscription,
    );
    expect(testState.connect).toHaveBeenCalledWith(
      testState.db,
      account,
      subscription,
    );
    expect(testState.created).toBeUndefined();
  });

  it('drops any pre-existing edge of the new account before connecting (no parallel edge)', async () => {
    // The parallel-edge state created before the relink guard: the
    // subscription is owned by acc-old, but acc-1 (the new account) already
    // holds a stale edge. The connect must be the only edge for acc-1.
    testState.findPushResult = subscription;
    testState.findAccountResult = { id: 'acc-old' };

    await createPushSubscription(account, { type: 'fcm', fcmToken: 'tok-1' });

    expect(testState.disconnect).toHaveBeenCalledTimes(2);
    expect(testState.disconnect).toHaveBeenNthCalledWith(
      1,
      testState.db,
      { id: 'acc-old' },
      subscription,
    );
    expect(testState.disconnect).toHaveBeenNthCalledWith(
      2,
      testState.db,
      account,
      subscription,
    );
    expect(testState.connect).toHaveBeenCalledTimes(1);
  });

  it('keeps the edge when the same account re-subscribes', async () => {
    testState.findPushResult = subscription;
    testState.findAccountResult = account;

    await createPushSubscription(account, { type: 'fcm', fcmToken: 'tok-1' });

    expect(testState.disconnect).not.toHaveBeenCalled();
    expect(testState.connect).not.toHaveBeenCalled();
  });

  it('links a new subscription as before', async () => {
    const result = await createPushSubscription(account, {
      type: 'fcm',
      fcmToken: 'tok-2',
    });

    expect(result).toEqual({ id: 'sub-new' });
    expect(testState.connect).toHaveBeenCalledWith(testState.db, account, {
      id: 'sub-new',
    });
    expect(testState.disconnect).not.toHaveBeenCalled();
  });
});

describe('createPushSubscription dedupe key covers all subscription types', () => {
  // The lookup key is the type-specific credential ({ type, endpoint/url/
  // apnToken/fcmToken }): the same string value under different credential
  // fields (or types) must never dedupe against each other.
  beforeEach(() => {
    testState.findPushResult = undefined;
    testState.findAccountResult = undefined;
    testState.created = undefined;
    testState.filterArgs = [];
    testState.connect.mockClear();
    testState.disconnect.mockClear();
  });

  it.each([
    ['web', { type: 'web', endpoint: 'https://push.example/1' }] as const,
    ['webhook', { type: 'webhook', url: 'https://hook.example/1' }] as const,
    ['apn', { type: 'apn', apnToken: 'apn-1' }] as const,
    ['fcm', { type: 'fcm', fcmToken: 'fcm-1' }] as const,
  ])(
    'dedupes %s subscriptions on the type-specific credential',
    async (_type, data) => {
      await createPushSubscription(account, { ...data });

      expect(testState.filterArgs).toEqual([{ matches: { ...data } }]);
    },
  );
});
