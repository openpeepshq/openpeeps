/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountExport } from './useAccountExport';

const { start, status, downloadUrl, statusResults } = vi.hoisted(() => ({
  start: vi.fn(async () => ({ data: { jobId: 'job-1' } })),
  status: vi.fn(),
  downloadUrl: vi.fn(async (_token?: string) => 'https://x/export?token=tok'),
  // Queue of status payloads the fake client pops per poll; repeats the last
  // when exhausted.
  statusResults: [] as Array<Record<string, unknown>>,
}));

const fakeClient = {
  accounts: {
    current: {
      export: {
        start: () => start(),
        status: (opts: unknown) => {
          status(opts);
          const next = statusResults.shift() ?? statusResults[0];
          return Promise.resolve(next ? { data: next } : undefined);
        },
        downloadUrl: (token: string) => downloadUrl(token),
      },
    },
  },
};

const t = (key: string, opts?: Record<string, string>) =>
  (opts?.defaultValue ?? key) as string;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: ReturnType<typeof useAccountExport>;

const renderHook = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Host = () => {
    captured = useAccountExport({ client: fakeClient as never, t: t as never });
    return null;
  };
  act(() => {
    root?.render(createElement(Host));
  });
};

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  start.mockReset().mockResolvedValue({ data: { jobId: 'job-1' } });
  status.mockReset();
  downloadUrl.mockReset().mockResolvedValue('https://x/export?token=tok');
  statusResults.length = 0;
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

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('useAccountExport', () => {
  // The button handler is fire-and-forget; mirror that by starting the
  // export without awaiting it, then letting the fake timers drive the
  // 2s polling loop.
  const beginExport = () => {
    act(() => {
      void captured.startExport();
    });
  };

  it('starts, polls to ready, and triggers a zip download', async () => {
    statusResults.push(
      { state: 'building' },
      { state: 'ready', downloadToken: 'tok', expiresAt: 'x' },
    );
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['zip']),
    })) as unknown as typeof fetch;
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    renderHook();
    beginExport();
    await advance(2000);
    await advance(2000);

    expect(start).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledTimes(2);
    expect(downloadUrl).toHaveBeenCalledWith('tok');
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    expect(captured.status).toBeNull();
  });

  it('reports the server error and stops polling', async () => {
    statusResults.push({ state: 'error', error: 'nope' });
    renderHook();
    beginExport();
    await advance(2000);

    expect(status).toHaveBeenCalledTimes(1);
    expect(captured.status?.type).toBe('error');
    expect(captured.status?.message).toContain('nope');
  });

  it('reports expiry when the export lapses', async () => {
    statusResults.push({ state: 'expired' });
    renderHook();
    beginExport();
    await advance(2000);

    expect(status).toHaveBeenCalledTimes(1);
    expect(captured.status?.type).toBe('error');
    expect(captured.status?.message).toContain('expired');
  });

  it('stops polling and asks for a new export when the job record is lost (not-found)', async () => {
    // The request endpoint pre-seeds `building` before it returns the jobId,
    // so `not-found` can only mean the record was lost (Redis eviction) —
    // the loop must stop immediately instead of re-polling to the deadline.
    statusResults.push({ state: 'not-found' });
    renderHook();
    beginExport();
    await advance(2000);

    expect(status).toHaveBeenCalledTimes(1);
    expect(captured.status?.type).toBe('error');
    expect(captured.status?.message).toContain('start a new one');

    // Polling must have stopped: further time advances queue no more polls.
    await advance(2000 * 5);
    expect(status).toHaveBeenCalledTimes(1);
  });

  it('clears a reported error with clearExportStatus', async () => {
    statusResults.push({ state: 'error', error: 'nope' });
    renderHook();
    beginExport();
    await advance(2000);
    expect(captured.status?.type).toBe('error');

    act(() => {
      captured.clearExportStatus();
    });
    expect(captured.status).toBeNull();
  });

  it('reports "Export did not finish in time" once polling passes the 15-minute deadline', async () => {
    // Only `building` is ever queued, so the loop runs until it passes the
    // 15-minute deadline (450 polls at the 2 s cadence).
    statusResults.push(
      ...Array.from({ length: 450 }, () => ({ state: 'building' })),
    );
    renderHook();
    beginExport();
    for (let i = 0; i < 75; i++) await advance(12000);

    expect(status).toHaveBeenCalledTimes(450);
    expect(captured.status?.type).toBe('error');
    expect(captured.status?.message).toContain('Export did not finish in time');

    // Polling must have stopped: further time advances queue no more polls.
    await advance(2000 * 5);
    expect(status).toHaveBeenCalledTimes(450);
    expect(captured.exporting).toBe(false);
  });
});
