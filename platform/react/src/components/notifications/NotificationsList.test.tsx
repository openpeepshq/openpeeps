/**
 * Pins the web `NotificationsList` empty-state copy (issue #354, round-8
 * suggestion 2): with an active type filter the empty feed must say
 * "No notifications of the selected types" (filtered message), otherwise the
 * plain "No notifications". The feed itself filters server-side via
 * `excludeTypes`, so both branches are reachable from the client.
 */
/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsList } from './NotificationsList';

let mockHasFilter = false;
let mockExcludeTypes: string | undefined;

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfileNotifications: () => ({
        data: undefined,
        isLoading: false,
        refetch: async () => {},
      }),
      markAllNotificationsAsSeenAction: () => async () => undefined,
    },
    queryClient: {
      setQueryData: () => {},
    },
    client: {
      profiles: {
        current: {
          notificationStats: { queryKey: () => ['stats'] },
        },
      },
    },
  }),
}));

vi.mock('../../hooks', () => ({
  useNotificationFeedFilter: () => ({
    hasFilter: mockHasFilter,
    excludeTypes: mockExcludeTypes,
  }),
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../lib/notificationBadge', () => ({
  markCachedNotificationsSeen: () => {},
  syncAppBadgeCount: async () => {},
}));

vi.mock('./NotificationItem', () => ({
  NotificationItem: () => null,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  LoadingSpinner: () => null,
}));

// An empty feed query: no items, not loading, no further pages.
const emptyQuery = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  refetch: async () => {},
  fetchNextPage: async () => {},
} as never;

describe('NotificationsList (web empty state)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockHasFilter = false;
    mockExcludeTypes = undefined;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  function render() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(NotificationsList, { query: emptyQuery }));
    });
  }

  it('shows the plain empty message when nothing is filtered', () => {
    render();
    expect(container!.textContent).toBe('No notifications');
  });

  it('shows the filtered empty message when a type filter is active', () => {
    mockHasFilter = true;
    mockExcludeTypes = 'repost';
    render();
    expect(container!.textContent).toBe(
      'No notifications of the selected types',
    );
  });
});
