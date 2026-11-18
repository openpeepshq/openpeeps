/** @vitest-environment jsdom */
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/layout/ToastProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { CredentialsStoreProvider } from '../contexts/credentialsStore';
import type { CredentialsStore } from '../auth/credentials/types';
import { authHooks, type LogoutResult } from '../contexts/openpeeps/hooks/auth';
import { isSubscriptionNotFound, unsubscribePushNotifications } from './index';

const testState = vi.hoisted(() => ({
  listPushSubscriptions: vi.fn(),
  deletePushSubcription: vi.fn(),
}));

vi.mock('@openpeepshq/client', () => ({
  openpeepsClient: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useQueryClient: () => undefined,
  };
});

// authHooks builds every action hook eagerly, so the client stub must answer
// any namespace with something callable: a recursive callable proxy, with the
// two subscription endpoints overridden by the per-test mocks.
const recursiveProxy = (): unknown =>
  new Proxy(function () {} as unknown as Record<string, unknown>, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : recursiveProxy(),
    apply: () => recursiveProxy(),
  });
const client = recursiveProxy() as never;
(client as Record<string, unknown>).accounts = {
  current: {
    listPushSubscriptions: testState.listPushSubscriptions,
    deletePushSubcription: testState.deletePushSubcription,
  },
};

vi.mock('../i18n/I18nProvider', async () => {
  const actual = await vi.importActual<typeof import('../i18n/I18nProvider')>(
    '../i18n/I18nProvider',
  );
  return {
    ...actual,
    useI18n: () => ({
      i18n: { language: 'en' },
      t: (key: string, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? key,
    }),
  };
});

// Real I18nProvider reads `t` off the instance; a tiny fake keeps the fallback
// deterministic (no locale files) while exercising the provider path.
const fakeI18n = {
  isInitialized: true,
  language: 'en',
  t: (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  on: () => undefined,
  off: () => undefined,
} as never;

const swRegistration = (endpoint: string | null) =>
  ({
    pushManager: {
      getSubscription: async () =>
        endpoint ? { endpoint, unsubscribe: vi.fn(async () => true) } : null,
    },
  }) as never;

const navigatorState = { registrations: [] as unknown[] };

const installNavigator = (product: string) => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      product,
      serviceWorker: {
        getRegistrations: async () => navigatorState.registrations,
        getRegistration: async () => undefined,
      },
    },
  });
};

// unsubscribePushNotifications gates on the web-push support check, which
// needs a window with Notification + serviceWorker + PushManager.
const installWebWindow = () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { Notification: {}, navigator: globalThis.navigator },
  });
  Object.defineProperty(globalThis.window, 'PushManager', {
    configurable: true,
    value: {},
  });
};

let store: { cleared: number };
const credentialsStore: CredentialsStore = {
  get: async () => null,
  set: async () => undefined,
  clear: async () => {
    store.cleared += 1;
  },
};

describe('logoutAction push cleanup', () => {
  let root: Root;
  let container: HTMLElement;

  const renderLogoutHook = () => {
    let logout: (() => Promise<LogoutResult>) | undefined;
    const Probe = () => {
      const hooks = authHooks(client, vi.fn(), vi.fn());
      logout = hooks.logoutAction();
      return null;
    };
    act(() => {
      container = document.body.appendChild(document.createElement('div'));
      root = createRoot(container);
      root.render(
        createElement(
          CredentialsStoreProvider,
          { credentialsStore },
          createElement(
            I18nProvider,
            { instance: fakeI18n } as never,
            createElement(ToastProvider, null, createElement(Probe)),
          ),
        ),
      );
    });
    return logout!;
  };

  beforeEach(() => {
    store = { cleared: 0 };
    credentialsStore.clear = async () => {
      store.cleared += 1;
    };
    navigatorState.registrations = [];
    testState.listPushSubscriptions.mockReset();
    testState.deletePushSubcription.mockReset();
    installNavigator('ReactNative');
  });

  afterEach(() => {
    act(() => root?.unmount());
  });

  it('runs best-effort cleanup before clearing credentials', async () => {
    const calls: string[] = [];
    testState.listPushSubscriptions.mockImplementation(async () => {
      calls.push('list');
      return { data: [] };
    });
    credentialsStore.clear = async () => {
      calls.push('clear');
      store.cleared += 1;
    };
    navigatorState.registrations = [swRegistration('https://push/1')];
    installNavigator('Gecko');
    installWebWindow();

    const logoutFn = renderLogoutHook();
    let result: LogoutResult | undefined;
    await act(async () => {
      result = await logoutFn();
    });

    expect(calls).toEqual(['list', 'clear']);
    expect(result).toEqual({ pushCleanup: 'ok' });
  });

  it('clears credentials even when the server unsubscribe fails and reports the failure', async () => {
    testState.listPushSubscriptions.mockRejectedValue({
      error: { __HTTP_ERROR__: true, status: 500 },
    });
    navigatorState.registrations = [swRegistration('https://push/1')];
    installNavigator('Gecko');
    installWebWindow();

    const logoutFn = renderLogoutHook();
    let result: LogoutResult | undefined;
    await act(async () => {
      result = await logoutFn();
    });

    expect(store.cleared).toBe(1);
    expect(result).toEqual({ pushCleanup: 'failed' });
    expect(
      document.body.textContent?.includes(
        'Could not remove push notifications for this device.',
      ),
    ).toBe(true);
  });

  it('skips the browser flow on React Native', async () => {
    const logoutFn = renderLogoutHook();
    let result: LogoutResult | undefined;
    await act(async () => {
      result = await logoutFn();
    });

    expect(testState.listPushSubscriptions).not.toHaveBeenCalled();
    expect(store.cleared).toBe(1);
    expect(result).toEqual({ pushCleanup: 'ok' });
  });
});

describe('unsubscribePushNotifications', () => {
  beforeEach(() => {
    testState.listPushSubscriptions.mockReset();
    testState.deletePushSubcription.mockReset();
    testState.deletePushSubcription.mockResolvedValue({ data: {} });
    navigatorState.registrations = [];
    installNavigator('Gecko');
    installWebWindow();
  });

  it('collects endpoints from every registration with one server list lookup', async () => {
    navigatorState.registrations = [
      swRegistration('https://push/a'),
      swRegistration(null),
      swRegistration('https://push/b'),
    ];
    testState.listPushSubscriptions.mockResolvedValue({
      data: [
        { id: 'row-a', type: 'web', endpoint: 'https://push/a' },
        { id: 'row-b', type: 'web', endpoint: 'https://push/b' },
      ],
    });

    const removed = await unsubscribePushNotifications({
      client: client as never,
    });

    expect(testState.listPushSubscriptions).toHaveBeenCalledTimes(1);
    expect(testState.deletePushSubcription).toHaveBeenCalledTimes(2);
    expect(removed).toBe(true);
  });

  it('removes server rows even when a local unsubscribe throws', async () => {
    navigatorState.registrations = [
      {
        pushManager: {
          getSubscription: async () => ({
            endpoint: 'https://push/a',
            unsubscribe: async () => {
              throw new Error('local boom');
            },
          }),
        },
      } as never,
    ];
    testState.listPushSubscriptions.mockResolvedValue({
      data: [{ id: 'row-a', type: 'web', endpoint: 'https://push/a' }],
    });

    await expect(
      unsubscribePushNotifications({ client: client as never }),
    ).rejects.toThrow('local boom');

    expect(testState.deletePushSubcription).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParameters: { pushSubscriptionId: 'row-a' },
      }),
    );
  });

  it('tolerates 404/410 as already-gone', async () => {
    navigatorState.registrations = [swRegistration('https://push/a')];
    testState.listPushSubscriptions.mockResolvedValue({
      data: [{ id: 'row-a', type: 'web', endpoint: 'https://push/a' }],
    });
    testState.deletePushSubcription.mockRejectedValue({
      error: { __HTTP_ERROR__: true, status: 404 },
    });

    const removed = await unsubscribePushNotifications({
      client: client as never,
    });
    expect(removed).toBe(true);
  });
});

describe('isSubscriptionNotFound', () => {
  it('accepts serialized httpError 404/410', () => {
    expect(
      isSubscriptionNotFound({ error: { __HTTP_ERROR__: true, status: 404 } }),
    ).toBe(true);
    expect(
      isSubscriptionNotFound({ error: { __HTTP_ERROR__: true, status: 410 } }),
    ).toBe(true);
  });

  it('rejects other statuses and plain errors', () => {
    expect(
      isSubscriptionNotFound({ error: { __HTTP_ERROR__: true, status: 500 } }),
    ).toBe(false);
    expect(isSubscriptionNotFound(new Error('nope'))).toBe(false);
    expect(
      isSubscriptionNotFound({ error: { message: 'subscription not found' } }),
    ).toBe(false);
  });
});
