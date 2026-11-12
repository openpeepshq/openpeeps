/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

const navigate = vi.fn();
const href = vi.fn(() => '#');

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
  }) => createElement('div', null, props.children),
  useServerInfo: () => ({ sso: [], communityConfig: {} }),
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    createElement('a', { href: to }, children),
}));

vi.mock('../../contexts/router', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => new URLSearchParams(),
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
    href.mockReturnValue('#');
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('defaults to the welcome page after successful login', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(Login));
    });

    expect(href).toHaveBeenCalledWith({ type: 'welcome' });
  });
});
