/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webNavHrefOf } from '../../test/webNavHrefOf';
import { ValidateEmail } from './ValidateEmail';

const navigate = vi.fn();
const validateEmail = vi.fn();
const invalidateQueries = vi.fn();
let searchToken: string | null = 'valid-token';
/** Shared mirror of the web navigator's target→path mapping (see
    test/webNavHrefOf.ts); unmapped target types throw instead of
    rendering a silently-wrong href. */
const hrefOf = vi.fn(webNavHrefOf);

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  useOpenpeeps: () => ({
    client: { auth: { validateEmail } },
    openpeepsApi: {},
  }),
  useHrefOf: () => hrefOf,
}));

vi.mock('../../components', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'auth-layout' }, children),
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [
    new URLSearchParams(searchToken ? `token=${searchToken}` : ''),
  ],
}));

describe('ValidateEmail', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    hrefOf.mockClear();
    invalidateQueries.mockClear();
    searchToken = 'valid-token';
    validateEmail.mockReset();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(ValidateEmail));
    });
    // Flush the async validation effect.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    return container;
  };

  it('navigates to the welcome page on a successful email validation', async () => {
    // A successful result object (no `error` key) is the contract ValidateEmail
    // checks with `'error' in result`.
    validateEmail.mockResolvedValue({ account: { id: 'a1' } });

    await render();

    expect(validateEmail).toHaveBeenCalledWith({
      queryParameters: { token: 'valid-token' },
    });
    expect(hrefOf).toHaveBeenCalledWith({ type: 'welcome' });
    expect(navigate).toHaveBeenCalledWith('/welcome');
  });

  it('does not navigate when validation fails', async () => {
    validateEmail.mockResolvedValue({ error: 'expired' });

    await render();

    expect(hrefOf).not.toHaveBeenCalledWith({ type: 'welcome' });
    expect(navigate).not.toHaveBeenCalled();
  });
});
