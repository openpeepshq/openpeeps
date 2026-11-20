/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthLayout } from './Auth';

let profileQueryValue:
  | {
      isFetching: boolean;
      isSuccess: boolean;
      data: { type: string; displayName?: string; handle?: string };
    }
  | undefined;
let serverInfoValue: {
  communityConfig?: Record<string, unknown>;
  payments?: { stripe?: { paidMembership?: { enabled?: boolean } } };
} = { communityConfig: {} };
let paymentQueryValue: {
  isFetching?: boolean;
  isSuccess?: boolean;
  data?: { status?: string };
} = { isFetching: false, isSuccess: false };
let stripeActiveValue = false;

vi.mock('@openpeepshq/common', () => ({
  getTheme: () => ({}),
  isStripeActive: () => stripeActiveValue,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Link: ({ action, children }: { action: string; children: React.ReactNode }) =>
    createElement('a', { href: action }, children),
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../server-data', () => ({
  useServerInfo: () => serverInfoValue,
}));

vi.mock('./IdentityContext', () => ({
  useCurrentProfileSettings: () => ({}),
}));

vi.mock('../profile/Avatar', () => ({
  Avatar: () => null,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfile: () => profileQueryValue,
      usePaymentStatus: () => paymentQueryValue,
    },
  }),
}));

vi.mock('../../contexts/credentialsStore', () => ({
  useCredentialsStore: () => ({
    credentialsStore: {
      get: vi.fn().mockResolvedValue({ token: 'test-token' }),
    },
  }),
}));

vi.mock('../../contexts/openpeeps/hooks/useHasAuthToken', () => ({
  useHasAuthToken: () => true,
}));

describe('AuthLayout post-authentication redirect', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn(), hash: '', search: '' },
      writable: true,
      configurable: true,
    });
    serverInfoValue = { communityConfig: {} };
    paymentQueryValue = { isFetching: false, isSuccess: false };
    stripeActiveValue = false;
    profileQueryValue = {
      isFetching: false,
      isSuccess: true,
      data: { type: 'local', displayName: 'Test', handle: 'tester' },
    };
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const assign = () =>
    window.location.assign as unknown as ReturnType<typeof vi.fn>;

  const renderLayout = async (
    redirectTo: string | null | undefined,
    hasPayment = false,
  ) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(AuthLayout, { redirectTo, hasPayment }));
    });
    // Flush the async effect: credentialsStore.get() resolves, then go() runs.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  it('redirects an unsafe ?redirect= to the welcome home, not the raw value', async () => {
    for (const redirectTo of ['https://evil.example', '//evil.example', 'x']) {
      await renderLayout(redirectTo);
      expect(assign()).toHaveBeenCalledWith('/welcome');
      expect(assign()).not.toHaveBeenCalledWith(redirectTo);
      (assign() as ReturnType<typeof vi.fn>).mockClear();
    }
  });

  it('honors a same-origin ?redirect= deep link', async () => {
    await renderLayout('/posts/1');
    expect(assign()).toHaveBeenCalledWith('/posts/1');
    expect(assign()).not.toHaveBeenCalledWith('/welcome');
  });

  it('sends a Stripe-paying user to the welcome home when ?payment= is set', async () => {
    // Active subscription + `?payment=` present: the Stripe branch takes
    // HOME_HREF instead of the (possibly absent) redirectTo deep link.
    serverInfoValue = {
      communityConfig: {},
      payments: { stripe: { paidMembership: { enabled: true } } },
    };
    paymentQueryValue = {
      isFetching: false,
      isSuccess: true,
      data: { status: 'active' },
    };
    stripeActiveValue = true;
    await renderLayout(undefined, true);
    expect(assign()).toHaveBeenCalledWith('/welcome');
  });
});
