/**
 * Unit tests for unregisterPushForLogout — the RN half of the #2147 logout
 * cleanup. The helper must delete this device's FCM row on the server
 * (tolerating an already-deleted row), then drop the local FCM token, and it
 * must never throw so logout cannot be blocked by push cleanup.
 *
 * The Firebase modules are mocked (the built package ships ESM which Jest's
 * node transform doesn't cover — same approach as the other tests in this
 * package). @openpeepshq/react is mocked too, but its handleResult /
 * isSubscriptionNotFound helpers are loaded from the real shared source so
 * they stay in sync with platform/react/src/push/pushSubscriptionErrors.ts.
 */

jest.mock('@react-native-firebase/app', () => {
  const state = {
    token: 'fcm-token-123' as string | undefined,
    getTokenError: undefined as unknown,
    deleteTokenError: undefined as unknown,
  };
  const getToken = jest.fn(async () => {
    if (state.getTokenError) throw state.getTokenError;
    return state.token;
  });
  const deleteToken = jest.fn(async () => {
    if (state.deleteTokenError) throw state.deleteTokenError;
  });
  return {
    __state: state,
    __getToken: getToken,
    __deleteToken: deleteToken,
    getApp: () => ({
      messaging: () => ({ getToken, deleteToken }),
    }),
  };
});

jest.mock('@react-native-firebase/messaging', () => ({
  // Delegate to the messaging instance the code passes in (the app mock
  // owns the token state), so getToken errors/absence mirror the device.
  getToken: jest.fn(async (messaging: { getToken: () => Promise<string> }) =>
    messaging.getToken()
  ),
  requestPermission: jest.fn(),
  AuthorizationStatus: {
    AUTHORIZED: 'authorized',
    PROVISIONAL: 'provisional',
    DENIED: 'denied',
  },
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(async () => null),
  setBackgroundMessageHandler: jest.fn(),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    onBackgroundEvent: jest.fn(() => jest.fn()),
    onForegroundEvent: jest.fn(() => jest.fn()),
    requestPermission: jest.fn(),
    createChannel: jest.fn(),
    setNotificationCategories: jest.fn(),
    displayNotification: jest.fn(),
    setBadgeCount: jest.fn(),
  },
  EventType: { PRESS: 'press', SHOW: 'show', DELETE: 'delete' },
}));

jest.mock('./utils', () => ({
  handleInternalURLNavigation: jest.fn(),
}));

jest.mock('./notification-helpers', () => ({
  setAppBadgeCount: jest.fn(),
  incrementAppBadgeCount: jest.fn(),
}));

// The built @openpeepshq/react ships ESM, which RN Jest's ts-jest transform
// can't load, so the package is mocked. But handleResult /
// isSubscriptionNotFound must stay the REAL implementation (a drift-prone
// inline copy was the point of the review), so load the dependency-free leaf
// source file the package exports them from. It has no imports, so ts-jest
// transforms it cleanly without pulling the rest of the package in, and it
// points at source (not dist) so it never depends on a react build.
const realPushErrors = jest.requireActual(
  '../../../react/src/push/pushSubscriptionErrors'
);

jest.mock('@openpeepshq/react', () => ({
  handleResult: realPushErrors.handleResult,
  isSubscriptionNotFound: realPushErrors.isSubscriptionNotFound,
  apiErrorMessage: jest.fn(),
}));

import { unregisterPushForLogout } from './push-notifications';

// jest.mock returns undefined; require the mocked module for its internals.
const firebaseApp = require('@react-native-firebase/app');

const makeClient = (rows: Array<Record<string, unknown>>) => {
  const listPushSubscriptions = jest.fn(async () => ({ data: rows }));
  const deletePushSubcription = jest.fn(async () => ({
    data: { success: true },
  }));
  const client = {
    accounts: {
      current: { listPushSubscriptions, deletePushSubcription },
    },
  };
  return { client, listPushSubscriptions, deletePushSubcription };
};

const httpError = (status: number) =>
  ({ error: { __HTTP_ERROR__: true, status } }) as unknown;

describe('unregisterPushForLogout', () => {
  let consoleInfo: jest.SpyInstance;

  beforeEach(() => {
    firebaseApp.__state.token = 'fcm-token-123';
    firebaseApp.__state.getTokenError = undefined;
    firebaseApp.__state.deleteTokenError = undefined;
    firebaseApp.__getToken.mockClear();
    firebaseApp.__deleteToken.mockClear();
    consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfo.mockRestore();
  });

  it('deletes this device’s FCM row on the server and drops the local token', async () => {
    const rows = [
      { type: 'fcm', fcmToken: 'other-device', id: 'sub-other' },
      { type: 'fcm', fcmToken: 'fcm-token-123', id: 'sub-own' },
      { type: 'web', endpoint: 'https://push.example/1', id: 'sub-web' },
    ];
    const { client, listPushSubscriptions, deletePushSubcription } =
      makeClient(rows);

    await expect(unregisterPushForLogout(client as never)).resolves.toBe('ok');

    expect(listPushSubscriptions).toHaveBeenCalledTimes(1);
    expect(deletePushSubcription).toHaveBeenCalledTimes(1);
    expect(deletePushSubcription).toHaveBeenCalledWith({
      pathParameters: { pushSubscriptionId: 'sub-own' },
    });
    expect(firebaseApp.__deleteToken).toHaveBeenCalledTimes(1);
  });

  it.each([404, 410])(
    'treats a %i from the delete as success (row already gone)',
    async (status) => {
      const rows = [{ type: 'fcm', fcmToken: 'fcm-token-123', id: 'sub-own' }];
      const { client, deletePushSubcription } = makeClient(rows);
      deletePushSubcription.mockRejectedValue(httpError(status));

      await expect(unregisterPushForLogout(client as never)).resolves.toBe(
        'ok'
      );

      // The token is still dropped locally even though the server row is gone.
      expect(firebaseApp.__deleteToken).toHaveBeenCalledTimes(1);
      expect(consoleInfo).not.toHaveBeenCalled();
    }
  );

  it('keeps the subscription as a fallback when the server delete fails hard, and still drops the token', async () => {
    const rows = [{ type: 'fcm', fcmToken: 'fcm-token-123', id: 'sub-own' }];
    const { client, deletePushSubcription } = makeClient(rows);
    deletePushSubcription.mockRejectedValue(httpError(500));

    // A hard server failure is reported so the caller can toast, while the
    // local token is still dropped.
    await expect(unregisterPushForLogout(client as never)).resolves.toBe(
      'failed'
    );

    expect(consoleInfo).toHaveBeenCalledWith(
      'Error removing push subscription on logout',
      expect.anything()
    );
    expect(firebaseApp.__deleteToken).toHaveBeenCalledTimes(1);
  });

  it('logs the list failure as a fallback path when listPushSubscriptions throws', async () => {
    const { client, listPushSubscriptions, deletePushSubcription } = makeClient(
      []
    );
    listPushSubscriptions.mockRejectedValue(httpError(503));

    // A hard server failure (even the list) is reported so the caller can toast.
    await expect(unregisterPushForLogout(client as never)).resolves.toBe(
      'failed'
    );

    expect(deletePushSubcription).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith(
      'Error removing push subscription on logout',
      expect.anything()
    );
    expect(firebaseApp.__deleteToken).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing when no FCM row matches this device’s token', async () => {
    const rows = [
      { type: 'fcm', fcmToken: 'other-device', id: 'sub-other' },
      { type: 'web', endpoint: 'https://push.example/1', id: 'sub-web' },
    ];
    const { client, deletePushSubcription } = makeClient(rows);

    await expect(unregisterPushForLogout(client as never)).resolves.toBe('ok');

    expect(deletePushSubcription).not.toHaveBeenCalled();
    expect(firebaseApp.__deleteToken).toHaveBeenCalledTimes(1);
  });

  it('is a no-op (no client calls, no token delete) when Firebase messaging is unavailable', async () => {
    firebaseApp.__state.getTokenError = new Error('no messaging');
    const { client, listPushSubscriptions } = makeClient([]);

    await expect(unregisterPushForLogout(client as never)).resolves.toBe('ok');

    expect(listPushSubscriptions).not.toHaveBeenCalled();
    expect(firebaseApp.__deleteToken).not.toHaveBeenCalled();
  });

  it('is a no-op when there is no token', async () => {
    firebaseApp.__state.token = undefined;
    const { client, listPushSubscriptions } = makeClient([]);

    await expect(unregisterPushForLogout(client as never)).resolves.toBe('ok');

    expect(listPushSubscriptions).not.toHaveBeenCalled();
    expect(firebaseApp.__deleteToken).not.toHaveBeenCalled();
  });

  it('never throws when the local token delete fails', async () => {
    firebaseApp.__state.deleteTokenError = new Error('token already gone');
    const { client } = makeClient([]);

    await expect(unregisterPushForLogout(client as never)).resolves.toBe('ok');
  });
});
