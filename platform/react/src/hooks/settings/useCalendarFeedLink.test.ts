/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarFeedLink, resolveOrigin } from './useCalendarFeedLink';

// The hook's `t` resolves to the defaultValue it receives, so assertions can
// pin the English copy the hook produces (mirrors the notification-prefs test).
vi.mock('../../i18n/context', () => ({
  useT: () => (key: string, opts?: Record<string, string>) =>
    opts?.defaultValue ?? key,
}));

const { hookFixture } = vi.hoisted(() => ({
  hookFixture: {
    baseUrl: 'https://ap.social',
    createCalendarFeed: vi.fn(),
    revokeCalendarFeed: vi.fn(),
  },
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    baseUrl: hookFixture.baseUrl,
    openpeepsApi: {
      createCurrentProfileCalendarFeedAction: () =>
        hookFixture.createCalendarFeed,
      revokeCurrentProfileCalendarFeedAction: () =>
        hookFixture.revokeCalendarFeed,
    },
  }),
}));

describe('resolveOrigin', () => {
  it('table: absolute URL, relative subpath, empty string, no window', () => {
    const pageOrigin = window.location.origin;
    expect(resolveOrigin('https://ap.social/profiles/me')).toBe(
      'https://ap.social',
    );
    // Relative subpath — `new URL` throws, falls back to the page origin.
    expect(resolveOrigin('/subpath')).toBe(pageOrigin);
    expect(resolveOrigin('')).toBe(pageOrigin);
    // RN composition: a full `Config.BASE_URL` origin with no `window`.
    const realWindow = (globalThis as { window?: typeof window }).window;
    try {
      delete (globalThis as { window?: typeof window }).window;
      expect(resolveOrigin('https://ap.social')).toBe('https://ap.social');
      expect(resolveOrigin('')).toBe('');
    } finally {
      (globalThis as { window?: typeof window }).window = realWindow;
    }
  });
});

describe('useCalendarFeedLink', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let captured: ReturnType<typeof useCalendarFeedLink> | undefined;

  const Host = () => {
    captured = useCalendarFeedLink();
    return null;
  };

  const renderHook = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(Host));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookFixture.baseUrl = 'https://ap.social';
    hookFixture.createCalendarFeed = vi.fn();
    hookFixture.revokeCalendarFeed = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
  });

  it('creates a link: composes origin + feed path + token into feedUrl', async () => {
    hookFixture.createCalendarFeed.mockResolvedValueOnce({
      token: 'abc123',
    });
    renderHook();
    await act(async () => {
      await captured!.createLink();
    });
    expect(hookFixture.createCalendarFeed).toHaveBeenCalledTimes(1);
    expect(captured!.feedUrl).toBe(
      'https://ap.social/api/openpeeps/core/v1/events/feed?token=abc123',
    );
    expect(captured!.creating).toBe(false);
    expect(captured!.status).toBeNull();
  });

  it('surfaces a failed create as an error status and keeps feedUrl unset', async () => {
    hookFixture.createCalendarFeed.mockRejectedValueOnce(
      new Error('network down'),
    );
    renderHook();
    await act(async () => {
      await captured!.createLink();
    });
    expect(captured!.feedUrl).toBeUndefined();
    expect(captured!.status).toEqual({
      type: 'error',
      message: 'Could not create the calendar link.',
    });
    expect(captured!.creating).toBe(false);
  });

  it('revokes: clears feedUrl and reports the success message', async () => {
    hookFixture.createCalendarFeed.mockResolvedValueOnce({
      token: 'abc123',
    });
    renderHook();
    await act(async () => {
      await captured!.createLink();
    });
    expect(captured!.feedUrl).toBeDefined();

    hookFixture.revokeCalendarFeed.mockResolvedValueOnce({});
    await act(async () => {
      await captured!.revokeLink();
    });
    expect(hookFixture.revokeCalendarFeed).toHaveBeenCalledTimes(1);
    expect(captured!.feedUrl).toBeUndefined();
    expect(captured!.status).toEqual({
      type: 'success',
      message: 'Calendar link deleted.',
    });
    expect(captured!.revoking).toBe(false);
  });

  it('surfaces a failed revoke as an error status', async () => {
    hookFixture.revokeCalendarFeed.mockRejectedValueOnce(new Error('boom'));
    renderHook();
    await act(async () => {
      await captured!.revokeLink();
    });
    expect(captured!.status).toEqual({
      type: 'error',
      message: 'Could not delete the calendar link.',
    });
  });

  it('clearStatus resets a previous status', async () => {
    hookFixture.revokeCalendarFeed.mockRejectedValueOnce(new Error('boom'));
    renderHook();
    await act(async () => {
      await captured!.revokeLink();
    });
    expect(captured!.status).not.toBeNull();
    act(() => {
      captured!.clearStatus();
    });
    expect(captured!.status).toBeNull();
  });
});
