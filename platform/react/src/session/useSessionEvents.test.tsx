/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionEvents } from './useSessionEvents';

// The hook's stream-failure path (issue #2277, round-17 review item #3) logs
// through the namespaced `logger('session')` helper and is suppressed after
// the stream is closed. The log helper and the stream endpoint are stubbed so
// a test can drive `onError` directly (a real feed would emit it on non-2xx).
const { warnSpy, listenOptionsRef } = vi.hoisted(() => ({
  warnSpy: vi.fn(),
  listenOptionsRef: {
    current: undefined as Record<string, unknown> | undefined,
  },
}));

vi.mock('../log', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: warnSpy,
    error: vi.fn(),
    fatal: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../contexts/credentialsStore', () => ({
  useCredentialsStore: () => ({
    credentialsStore: { get: async () => ({ token: 'tok' }) },
  }),
}));

const client = {
  profiles: {
    current: {
      sessionEvents: {
        listen: (options: Record<string, unknown>) => {
          listenOptionsRef.current = options;
          return Promise.resolve({ stream: () => {}, close: () => {} });
        },
      },
    },
  },
};

describe('useSessionEvents stream failure', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const mount = (enabled = true) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const Host = () => {
      useSessionEvents(client as never, enabled);
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
    warnSpy.mockClear();
    listenOptionsRef.current = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('logs a session stream failure once with the SseError details', async () => {
    mount();
    // Let the hook's async open (token read → listen) settle.
    await act(async () => {});
    const onError = listenOptionsRef.current?.onError as
      | ((e: unknown) => void)
      | undefined;
    expect(onError).toBeTypeOf('function');

    const sseError = { status: 401, key: 'error.sessionRevoked' };
    act(() => {
      onError?.(sseError);
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'session events stream failed to open:',
      sseError,
    );
  });

  it('suppresses the failure log after the stream is closed', async () => {
    mount();
    await act(async () => {});
    const onError = listenOptionsRef.current?.onError as
      | ((e: unknown) => void)
      | undefined;
    expect(onError).toBeTypeOf('function');

    // Unmount sets the `closed` guard; a late error must not log.
    act(() => {
      root?.unmount();
    });
    root = undefined;

    act(() => {
      onError?.({ status: 503 });
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not open a stream when disabled', async () => {
    mount(false);
    await act(async () => {});
    expect(listenOptionsRef.current).toBeUndefined();
  });
});
