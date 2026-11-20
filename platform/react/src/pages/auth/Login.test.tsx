/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webNavHrefOf } from '../../test/webNavHrefOf';
import { Login } from './Login';

/** Shared mirror of the web navigator's target→path mapping (see
    test/webNavHrefOf.ts); unmapped target types throw instead of
    rendering a silently-wrong href. */
const href = vi.fn(webNavHrefOf);
let searchParams = new URLSearchParams();
const navigate = vi.fn();
let authLayoutRedirectTo: string | null | undefined;

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
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
    error: null,
    clearError: () => {},
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
