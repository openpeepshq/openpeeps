/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OidcCallback } from './OidcCallback';

const navigate = vi.fn();
const hrefOf = vi.fn(() => '#');
const credentialsSet = vi.fn().mockResolvedValue(undefined);

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/credentialsStore', () => ({
  useCredentialsStore: () => ({
    credentialsStore: { set: credentialsSet },
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [
    { get: (key: string) => (key === 'token' ? 'test-token' : null) },
  ],
}));

vi.mock('../../contexts/router', () => ({
  useHrefOf: () => hrefOf,
}));

describe('OidcCallback', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    hrefOf.mockReturnValue('#');
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

  it('navigates to the welcome page after successful OIDC authentication', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(OidcCallback));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hrefOf).toHaveBeenCalledWith({ type: 'welcome' });
    expect(navigate).toHaveBeenCalledWith('#');
  });
});
