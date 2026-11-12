/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SsoCallback } from './SsoCallback';

const navigate = vi.fn();
const hrefOf = vi.fn(() => '#');
const authenticate = vi.fn();
const credentialsSet = vi.fn().mockResolvedValue(undefined);

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    client: {
      sso: { generic: { authenticate } },
    },
    openpeepsApi: {},
  }),
}));

vi.mock('../../contexts/credentialsStore', () => ({
  useCredentialsStore: () => ({
    credentialsStore: { set: credentialsSet },
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('../../contexts/router', () => ({
  useHrefOf: () => hrefOf,
}));

Object.defineProperty(window, 'location', {
  value: { hash: '', search: '' },
  writable: true,
});

describe('SsoCallback', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    hrefOf.mockReturnValue('#');
    authenticate.mockReset();
    credentialsSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('navigates to the welcome page after successful SSO authentication', async () => {
    authenticate.mockResolvedValue({ data: { token: 'test-token' } });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(SsoCallback));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(navigate).toHaveBeenCalledWith('#');
  });
});
