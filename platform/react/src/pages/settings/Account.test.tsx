/** @vitest-environment jsdom */
import { act, createElement, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { status, start, downloadUrl, tokenUsed, tCalls, statusCalls } =
  vi.hoisted(() => ({
    status: vi.fn(),
    start: vi.fn(async () => ({ data: { jobId: 'job-1' } })),
    downloadUrl: vi.fn(async (_token?: string) => 'https://x/export?token=tok'),
    tokenUsed: { used: false },
    tCalls: [] as Array<{ key: string; opts?: Record<string, string> }>,
    // Real contract: `status` is called with the polled job as a query
    // parameter (`status({ queryParameters: { jobId } })`), so the fake must
    // capture what it was called with instead of dropping the argument.
    statusCalls: [] as Array<Record<string, unknown>>,
  }));

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: Record<string, string>) => {
    tCalls.push({ key, opts });
    return (opts?.defaultValue ?? key).replace(
      /\{\{(\w+)\}\}/g,
      (_m: string, name: string) => opts?.[name] ?? '',
    );
  },
  useOpenpeeps: () => ({
    client: {
      accounts: {
        current: {
          export: {
            start: () => start(),
            status: (params?: Record<string, unknown>) => {
              statusCalls.push(params ?? {});
              return status(params);
            },
            downloadUrl: (token: string) => {
              tokenUsed.used = token === 'tok';
              return downloadUrl(token);
            },
          },
        },
      },
    },
    openpeepsApi: {
      updateCurrentAccountAction: () => vi.fn(),
      validationEmailAction: () => vi.fn(),
    },
  }),
  useSetPageHeader: () => undefined,
}));

vi.mock('../../components', () => ({
  useCurrentAccount: () => ({ id: 'me', email: 'me@example.com' }),
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (
    props: {
      children?: ReactNode;
      action?: () => void;
      loading?: boolean;
      'data-testid'?: string;
    } & Record<string, unknown>,
  ) =>
    createElement(
      'button',
      {
        'data-testid': props['data-testid'],
        disabled: props.loading,
        onClick:
          typeof props.action === 'function'
            ? () => props.action!()
            : undefined,
      },
      props.children,
    ),
  Input: (props: { children?: ReactNode } & Record<string, unknown>) =>
    createElement('input', props),
  Label: (props: { children?: ReactNode } & Record<string, unknown>) =>
    createElement('label', props, props.children),
  Toast: (props: { children?: ReactNode }) =>
    createElement('div', null, props.children),
}));

import { AccountSettings } from './Account';

describe('AccountSettings export flow', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    status.mockReset();
    start.mockReset();
    start.mockImplementation(async () => ({ data: { jobId: 'job-1' } }));
    tCalls.length = 0;
    statusCalls.length = 0;
    tokenUsed.used = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    vi.useRealTimers();
  });

  const render = (element: ReactElement) => {
    act(() => {
      root?.render(element);
    });
  };

  const clickExport = () => {
    const btn = container?.querySelector(
      '[data-testid=settings-account-export]',
    ) as HTMLButtonElement;
    act(() => {
      btn.click();
    });
  };

  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  const errorMessage = () =>
    container?.querySelector('[role=alert]')?.textContent ??
    container?.textContent ??
    '';

  it('starts the export, polls until ready, then downloads the zip', async () => {
    status
      .mockResolvedValueOnce({ data: { state: 'building' } })
      .mockResolvedValueOnce({
        data: { state: 'ready', downloadToken: 'tok', expiresAt: 'x' },
      });
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['zip']),
    })) as unknown as typeof fetch;
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    render(createElement(AccountSettings));
    clickExport();
    await advance(2000);
    await advance(2000);

    expect(status).toHaveBeenCalledTimes(2);
    expect(tokenUsed.used).toBe(true);
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    // Pin the polling contract: exactly one job is started per run, and every
    // status poll carries the job the server told the hook to poll — not a
    // stale or wrong id.
    expect(start).toHaveBeenCalledTimes(1);
    expect(statusCalls.length).toBe(2);
    expect(
      statusCalls.every(
        (c) =>
          (c.queryParameters as { jobId?: string } | undefined)?.jobId ===
          'job-1',
      ),
    ).toBe(true);
    // No error state after a successful download.
    expect(errorMessage()).not.toContain('Failed:');
  });

  it('stops polling and reports the export error', async () => {
    status.mockResolvedValue({ data: { state: 'error', error: 'nope' } });
    render(createElement(AccountSettings));
    clickExport();
    await advance(2000);

    expect(status).toHaveBeenCalledTimes(1);
    expect(errorMessage()).toContain('nope');
    // The `exportFailed` locale is `"...: {{error}}"`; the message only
    // renders correctly if the `error` option is actually passed (i18next does
    // not substitute from `defaultValue`), so pin the interpolation at the
    // call site rather than trusting the rendered text.
    const failedCall = tCalls.find(
      (c) => c.key === 'settings.account.exportFailed',
    );
    expect(failedCall?.opts?.error).toBe('nope');
  });

  it('stops polling and reports expiry when the export has lapsed', async () => {
    status.mockResolvedValue({ data: { state: 'expired' } });
    render(createElement(AccountSettings));
    clickExport();
    await advance(2000);

    expect(status).toHaveBeenCalledTimes(1);
    expect(errorMessage()).toContain('expired');
  });

  it('gives up after the 15-minute polling cap', async () => {
    status.mockResolvedValue({ data: { state: 'building' } });
    render(createElement(AccountSettings));
    clickExport();
    // Jump past the 15-minute deadline (polling runs every 2s).
    await advance(15 * 60 * 1000 + 4000);

    expect(status).toHaveBeenCalled();
    expect(errorMessage()).toContain('did not finish in time');
  });
});
