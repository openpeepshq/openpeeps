/**
 * Pins the RN `NotificationsList` empty-state copy (issue #354, round-8
 * suggestion 2): with an active type filter the empty feed shows the
 * `notification.emptyFiltered` copy, otherwise `notification.empty`. The feed
 * filters server-side via `excludeTypes`, so both branches are reachable from
 * the client.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NotificationsList } from './NotificationsList';

let mockHasFilter = false;
let mockExcludeTypes: string | undefined;
const mockEmptyCalls: Array<{ copyKey: string }> = [];

jest.mock('react-native', () => ({
  ScrollView: (props: { children?: React.ReactNode }) =>
    React.createElement('ScrollView', null, props.children),
  RefreshControl: (props: Record<string, unknown>) =>
    React.createElement('RefreshControl', props),
  ActivityIndicator: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfileNotifications: () => ({
        data: { pages: [] },
        isLoading: false,
        refetch: async () => {},
      }),
    },
  }),
  useNotificationFeedFilter: () => ({
    hasFilter: mockHasFilter,
    excludeTypes: mockExcludeTypes,
  }),
}));

jest.mock('../../lib/utils', () => ({
  handleScroll: () => {},
}));

jest.mock('../custom/common/empty-state-container', () => {
  // Rendered as a component type (not a host tag) so the props actually reach
  // the mock body, which records the `copyKey` the list selected.
  const MockEmpty = (props: { copyKey: string; defaultValue?: string }) => {
    mockEmptyCalls.push(props);
    return React.createElement('EmptyStateContainer', null, props.copyKey);
  };
  return { EmptyStateContainer: MockEmpty };
});

jest.mock('./NotificationItem', () => ({
  NotificationItem: () => null,
}));

// An empty feed query: no items, not loading, no further pages.
const emptyQuery = {
  data: { pages: [] },
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  refetch: async () => {},
  fetchNextPage: async () => {},
};

describe('NotificationsList (RN empty state)', () => {
  beforeEach(() => {
    mockHasFilter = false;
    mockExcludeTypes = undefined;
    mockEmptyCalls.length = 0;
  });

  const render = () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(NotificationsList, {
          query: emptyQuery as never,
          isNotificationFeed: false,
        })
      );
    });
    return tree;
  };

  it('shows the plain empty copy when nothing is filtered', () => {
    const tree = render();
    expect(mockEmptyCalls).toEqual([
      expect.objectContaining({ copyKey: 'notification.empty' }),
    ]);
    tree.unmount();
  });

  it('shows the filtered empty copy when a type filter is active', () => {
    mockHasFilter = true;
    mockExcludeTypes = 'repost';
    const tree = render();
    expect(mockEmptyCalls).toEqual([
      expect.objectContaining({ copyKey: 'notification.emptyFiltered' }),
    ]);
    tree.unmount();
  });
});
