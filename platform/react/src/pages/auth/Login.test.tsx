/** @vitest-environment jsdom */
import i18next, { type TFunction } from 'i18next';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerApiErrorMessage } from '../../lib/registerErrors';
import { webNavHrefOf } from '../../test/webNavHrefOf';
import { Login } from './Login';

/** Shared mirror of the web navigator's target→path mapping (see
    test/webNavHrefOf.ts); unmapped target types throw instead of
    rendering a silently-wrong href. */
const href = vi.fn(webNavHrefOf);
let searchParams = new URLSearchParams();
const navigate = vi.fn();
let authLayoutRedirectTo: string | null | undefined;

// Drives the `usePasswordLogin` error per test (see the display-path
// describe block below). The mock factory is hoisted, so both it and the
// i18n copy it renders with must live in vi.hoisted.
//
// The DICT mirrors platform/i18n/src/locales/en.json (same pattern as
// lib/__tests__/apiErrorMessage.test.ts), so the display-path cases pin the
// actual user-facing copy — not just the key. The i18next instance is
// created lazily on first use: vi.hoisted factories run before this file's
// imports are initialized.
const { loginState, t } = vi.hoisted(() => {
  const DICT: Record<string, string> = {
    'auth.login.invalidCredentials':
      "This email/password combination doesn't match a valid account.",
    'auth.login.error': 'Invalid credentials',
    'common.errors.unauthorized': 'Please log in to continue',
    'common.errors.networkError':
      'Network error. Please check your connection.',
    'common.errors.error': 'Error',
    'error.emailAlreadyTaken': 'That email is already in use.',
    'auth.register.error': 'Registration failed',
  };
  let fixed: TFunction | undefined;
  const t = ((
    key: string,
    opts?: { defaultValue?: string; [k: string]: unknown },
  ): string => {
    if (!fixed) {
      const i18n = i18next.createInstance();
      i18n.init({
        resources: { en: { translation: DICT } },
        lng: 'en',
        fallbackLng: 'en',
      });
      fixed = i18n.getFixedT('en');
    }
    return fixed(key, opts);
  }) as unknown as TFunction;
  return { loginState: { error: null as unknown }, t };
});

vi.mock('../../i18n', () => ({
  useT: () => t,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({ openpeepsApi: {} }),
}));

vi.mock('../../components', () => ({
  AuthLayout: (props: {
    children: React.ReactNode;
    redirectTo: string;
    navigate: (url: string) => void;
    hasPayment: boolean;
  }) => {
    authLayoutRedirectTo = props.redirectTo;
    return createElement('div', null, props.children);
  },
  useServerInfo: () => ({ sso: [], communityConfig: {} }),
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    createElement('a', { href: to }, children),
}));

vi.mock('../../contexts/router', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => searchParams,
  useHrefOf: () => href,
}));

vi.mock('../../hooks', () => ({
  usePasswordLogin: () => ({
    login: async () => ({}),
    get error() {
      return loginState.error;
    },
    clearError: () => {
      loginState.error = null;
    },
  }),
}));

describe('Login', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    href.mockClear();
    searchParams = new URLSearchParams();
    authLayoutRedirectTo = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const renderLogin = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Login));
    });
  };

  it('defaults to the welcome page after login', async () => {
    await renderLogin();

    // The welcome target is computed, and it becomes the post-login destination.
    expect(href).toHaveBeenCalledWith({ type: 'welcome' });
    expect(authLayoutRedirectTo).toBe('/welcome');
  });

  it('lets an explicit ?redirect= deep link take precedence over welcome', async () => {
    searchParams = new URLSearchParams({ redirect: '/posts/1' });
    await renderLogin();

    // The deep link wins, so the welcome href is not the destination.
    expect(authLayoutRedirectTo).toBe('/posts/1');
    expect(authLayoutRedirectTo).not.toBe('/welcome');
  });

  it('falls back to welcome when ?redirect= is not a same-origin path', async () => {
    for (const redirect of [
      'https://evil.example',
      '//evil.example',
      'javascript:alert(1)',
    ]) {
      searchParams = new URLSearchParams({ redirect });
      await renderLogin();

      // Unsafe targets are rejected, so the welcome href is the destination.
      expect(href).toHaveBeenCalledWith({ type: 'welcome' });
      expect(authLayoutRedirectTo).toBe('/welcome');
    }
  });

  it('lets a valid ?redirect= win in either position with duplicate params', async () => {
    // First value is invalid, second is valid: the invalid one is skipped,
    // the valid deep link still survives.
    searchParams = new URLSearchParams([
      ['redirect', '//evil.example'],
      ['redirect', '/posts/1'],
    ]);
    await renderLogin();
    expect(authLayoutRedirectTo).toBe('/posts/1');

    // First value is valid, second is invalid: the valid deep link still
    // wins, the invalid one does not clobber it.
    await renderLogin();
    expect(authLayoutRedirectTo).toBe('/posts/1');

    searchParams = new URLSearchParams([
      ['redirect', '/posts/1'],
      ['redirect', '//evil.example'],
    ]);
    await renderLogin();
    expect(authLayoutRedirectTo).toBe('/posts/1');
  });

  it('falls back to welcome when no ?redirect= value survives sanitization', async () => {
    searchParams = new URLSearchParams([
      ['redirect', '//evil.example'],
      ['redirect', 'https://evil.example'],
    ]);
    await renderLogin();

    // Every value is rejected, so the welcome href is the destination.
    expect(href).toHaveBeenCalledWith({ type: 'welcome' });
    expect(authLayoutRedirectTo).toBe('/welcome');
  });
});

// Round-8 review (issue #1915): the user-visible auth-failure copy had no
// display-path coverage. These cases drive a real wire error through the
// page's Toast branch and assert the exact rendered copy, so a wrong
// testid-level binding or a bad mapper call in Login.tsx fails CI.
describe('Login auth-failure copy (display path)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    loginState.error = null;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const renderLogin = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Login));
    });
  };

  const loginErrorToast = () =>
    container!.querySelector('[data-testid="auth-login-error"]');

  it('renders the localized invalid-credentials copy for the real 401 wire shape', async () => {
    // The server sends the i18n key with the status at the top level
    // (loginHandler: unknown account and wrong password both 401).
    loginState.error = {
      status: 401,
      key: 'auth.login.invalidCredentials',
      message: 'auth.login.invalidCredentials',
    };
    await renderLogin();

    // The toast binds testid "auth-login-error" and maps the wire key to the
    // localized copy — not the page fallback and not the generic 401 copy.
    const toast = loginErrorToast();
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain(
      "This email/password combination doesn't match a valid account.",
    );
    expect(toast?.textContent).not.toContain('Invalid credentials');
    expect(toast?.textContent).not.toContain('Please log in to continue');
  });

  it('renders the network copy when the login request fails at the transport level', async () => {
    loginState.error = new Error('Failed to fetch');
    await renderLogin();

    const toast = loginErrorToast();
    expect(toast?.textContent).toContain(
      'Network error. Please check your connection.',
    );
  });

  it('renders the page fallback for an error with no message and no status', async () => {
    loginState.error = new Error('');
    await renderLogin();

    const toast = loginErrorToast();
    expect(toast?.textContent).toContain('Invalid credentials');
  });
});

// RN parity: the native Login has no page-level test of its own (only
// Welcome.test.tsx exists in pages/auth), so the RN seam of the same mapper
// — the re-export surface `react-native.ts` feeds to @openpeepshq/react
// under the react-native export condition — is pinned here through the
// shared registerApiErrorMessage module it re-exports.
describe('RN surface: registerApiErrorMessage re-export pins the same copy', () => {
  it('maps the duplicate-email 409 wire key to the localized copy', () => {
    expect(
      registerApiErrorMessage(
        {
          status: 409,
          key: 'error.emailAlreadyTaken',
          message: 'error.emailAlreadyTaken',
        },
        t,
      ),
    ).toBe('That email is already in use.');
  });

  it('falls back to the localized registration-failure copy for an empty-candidate error', () => {
    // A status-only wire error (no message, no key) has no candidate, so
    // the page-specific fallback wins — not a raw passthrough.
    expect(registerApiErrorMessage({ status: 500 }, t)).toBe(
      'Registration failed',
    );
  });
});
