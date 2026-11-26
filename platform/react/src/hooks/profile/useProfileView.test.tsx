/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileView } from './useProfileView';

// Configure React's act environment so act() works and does not warn to
// console.error (required by the in-flight settle test's error assertions).
// Set at module level, not in a setup file: this is this repo's established
// convention for jsdom component tests (see Members.test.tsx, Login.test.tsx,
// OidcCallback.test.tsx, …), the flag only matters under the jsdom
// environment this file opts into, and leaving it unset here is a no-op in
// this isolated module so it cannot leak between suites.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  hasToken: true,
  seen: vi.fn(async () => ({ success: true })),
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({ client: { profiles: { seen: mocks.seen } } }),
  useHasAuthToken: () => mocks.hasToken,
}));

let container: HTMLDivElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;
let current: { id?: string; enabled?: boolean } = {};

// A single persistent root and a single stable probe component type, so
// each `render()` performs a true re-render (same fibers, same refs) with
// the current profile id / enabled flag.
const Host = () => {
  useProfileView(current.id, { enabled: current.enabled });
  return null;
};

const render = () => {
  root = root ?? createRoot(container!);
  act(() => {
    root!.render(createElement(Host));
  });
};

beforeEach(() => {
  root = undefined;
  mocks.hasToken = true;
  // Restore the default seen() implementation too: a test that swaps it for
  // an in-flight promise must not be able to leak that mock into later tests
  // if it fails before its own restore runs.
  mocks.seen.mockImplementation(async () => ({ success: true }));
  mocks.seen.mockClear();
  current = {};
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  vi.useRealTimers();
  act(() => {
    root?.unmount();
  });
  root = undefined;
  container?.remove();
  container = undefined;
});

describe('useProfileView (#802)', () => {
  it('fires once after the dwell delay for a logged-in viewer', () => {
    current = { id: 'profile-1' };
    render();
    expect(mocks.seen).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mocks.seen).toHaveBeenCalledTimes(1);
    expect(mocks.seen).toHaveBeenCalledWith({ profileIds: ['profile-1'] });
  });

  it('does not fire without an auth token', () => {
    mocks.hasToken = false;
    current = { id: 'profile-1' };
    render();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mocks.seen).not.toHaveBeenCalled();
  });

  it('does not fire when disabled (own profile or blocked)', () => {
    current = { id: 'profile-1', enabled: false };
    render();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mocks.seen).not.toHaveBeenCalled();
  });

  it('does not fire without a profile id', () => {
    current = { id: undefined };
    render();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mocks.seen).not.toHaveBeenCalled();
  });

  it('fires once per profile id and re-arms when the id changes', () => {
    current = { id: 'profile-1' };
    render();
    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.seen).toHaveBeenCalledTimes(1);

    // Same id re-rendering must not double-fire.
    render();
    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.seen).toHaveBeenCalledTimes(1);

    // A different profile re-arms the timer and fires for the new id.
    current = { id: 'profile-2' };
    render();
    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.seen).toHaveBeenCalledTimes(2);
    expect(mocks.seen).toHaveBeenLastCalledWith({ profileIds: ['profile-2'] });
  });

  it('cancels a pending view on unmount', () => {
    const root = createRoot(container!);
    act(() =>
      root.render(
        createElement(() => {
          useProfileView('profile-1');
          return null;
        }),
      ),
    );
    act(() => root.unmount());
    act(() => vi.advanceTimersByTime(5000));
    expect(mocks.seen).not.toHaveBeenCalled();
  });

  it('lets an in-flight view request settle after unmount (fire-and-forget)', async () => {
    // A controllable promise so unmount happens inside the window between the
    // dwell timer firing and the `client.profiles.seen` promise settling.
    let settleSeen!: (value: { success: boolean }) => void;
    const inFlight = new Promise<{ success: boolean }>((resolve) => {
      settleSeen = resolve;
    });
    mocks.seen.mockImplementation(() => inFlight);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const root = createRoot(container!);
    act(() =>
      root.render(
        createElement(() => {
          useProfileView('profile-1');
          return null;
        }),
      ),
    );

    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.seen).toHaveBeenCalledTimes(1);

    // Unmounting mid-request must not abort it: the server records the view
    // the moment it receives the request, so a later regression that moves
    // the fire into an effect-cleanup abort (AbortSignal, a `cancelled` flag)
    // would turn this settled request into an aborted/rejected one.
    act(() => root.unmount());

    let settled: { type: 'resolved' | 'rejected'; value?: unknown } = {
      type: 'rejected',
    };
    inFlight.then(
      (value) => {
        settled = { type: 'resolved', value };
      },
      (error) => {
        settled = { type: 'rejected', value: error };
      },
    );

    act(() => {
      settleSeen({ success: true });
    });
    await Promise.resolve();

    expect(settled).toEqual({ type: 'resolved', value: { success: true } });
    // No error surfaced from the settling request chain, no duplicate fire.
    expect(errorSpy).not.toHaveBeenCalled();
    expect(mocks.seen).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
