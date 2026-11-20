/**
 * Regression tests for the RN notification type-filter sheet (issue #354).
 *
 * The web `NotificationHeaderActions` already pins its filter menu; the RN
 * sheet is the one rendering layer the shared-hook test cannot see (it renders
 * rows from the `useNotificationFeedFilter` data and drives `toggle`/`showAll`
 * from row presses). These lock in the RN-only wiring: one checkbox row per
 * type with `accessibilityState.checked` from `isHidden`, cumulative toggles,
 * and the conditional "Show all types" footer that clears the filter.
 *
 * External imports are mocked (node jest env, no native modules) — the sheet
 * primitive renders its `data` rows inline so they are inspectable.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NotificationHeaderActions } from './NotificationHeaderActions';

// --- shared mutable state (mock* prefix is hoisting-safe) -------------------
const TYPES = [{ type: 'repost' }, { type: 'reaction' }, { type: 'pollVote' }];
let mockHidden: Set<string> = new Set();
const mockToggle = jest.fn(async (type: string) => {
  if (mockHidden.has(type)) mockHidden.delete(type);
  else mockHidden.add(type);
});
const mockShowAll = jest.fn(async () => {
  mockHidden = new Set();
});
const mockMarkAllSeen = jest.fn(async (_path?: unknown, _q?: unknown) => {});

jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: React.ReactNode }) =>
    React.createElement(tag, props, props.children);
  return {
    View: make('View'),
    Pressable: make('Pressable'),
    Text: make('Text'),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      // Returns the endpoint function directly (not an async wrapper) so the
      // test can assert the args `markAllRead` forwards to it — the wiring
      // that encodes the approved mark-all split (visible types only).
      markAllNotificationsAsSeenAction: () => () => mockMarkAllSeen,
    },
    queryClient: {},
  }),
  markCachedNotificationsSeen: () => {},
  useNotificationFeedFilter: () => ({
    types: TYPES,
    hiddenTypes: mockHidden,
    isHidden: (type: string) => mockHidden.has(type),
    toggle: mockToggle,
    showAll: mockShowAll,
    hasFilter: mockHidden.size > 0,
    excludeTypes: mockHidden.size
      ? [...mockHidden].sort().join(',')
      : undefined,
  }),
}));

jest.mock('../icons/index', () => {
  const React = require('react');
  const icon = (name: string) => () => React.createElement(name);
  return {
    CheckCheckIcon: icon('CheckCheckIcon'),
    Settings2Icon: icon('Settings2Icon'),
    SlidersHorizontalIcon: icon('SlidersHorizontalIcon'),
  };
});

jest.mock('../ui/button', () => {
  const React = require('react');
  return {
    Button: (props: { children?: React.ReactNode }) =>
      React.createElement('Button', props, props.children),
  };
});

jest.mock('../ui/checkbox', () => {
  const React = require('react');
  return {
    Checkbox: (props: Record<string, unknown>) =>
      React.createElement('Checkbox', props),
  };
});

jest.mock('../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: React.ReactNode }) =>
      React.createElement('ThemedText', props, props.children),
  };
});

jest.mock('../ui/bottom-sheet', () => {
  const React = require('react');
  const passThrough =
    (tag: string) => (props: { children?: React.ReactNode }) =>
      React.createElement(tag, props, props.children);
  return {
    BottomSheet: passThrough('BottomSheet'),
    BottomSheetContent: passThrough('BottomSheetContent'),
    BottomSheetHeader: passThrough('BottomSheetHeader'),
    // Render `data` rows inline (plus the footer) so the sheet's contents are
    // inspectable without a native ScrollView/FlatList.
    BottomSheetFlatList: (props: {
      data?: Array<{ type: string }>;
      renderItem: (p: {
        item: { type: string };
        index: number;
      }) => React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      React.createElement(
        'BottomSheetFlatList',
        null,
        (props.data ?? []).map((item, index) =>
          React.createElement(
            'View',
            { key: index },
            props.renderItem({ item, index })
          )
        ),
        props.ListFooterComponent
      ),
    useBottomSheet: () => ({
      ref: { current: { present: jest.fn(), dismiss: jest.fn() } },
      open: jest.fn(),
      close: jest.fn(),
    }),
  };
});

const render = () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(NotificationHeaderActions)
    );
  });
  return tree;
};

// The row Pressables carry `accessibilityRole="checkbox"`; the header Buttons
// and the "Show all types" footer do not, so this isolates the type rows.
const rows = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType('Pressable')
    .filter((p) => p.props.accessibilityRole === 'checkbox');
const showAllRow = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType('Pressable')
    .find((p) => p.props.accessibilityRole !== 'checkbox');
// The header's first Button is "Mark all as read" (its onPress drives
// markAllRead); the i18n mock resolves its label to the raw key.
const markAllReadButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType('Button')
    .find(
      (b) =>
        b.props.accessibilityLabel ===
        'settings.notifications.feedPreferences.markAllRead'
    );

describe('NotificationHeaderActions (RN filter sheet)', () => {
  beforeEach(() => {
    mockHidden = new Set();
    mockToggle.mockClear();
    mockShowAll.mockClear();
    mockMarkAllSeen.mockClear();
  });

  it('pins one checkbox row per type with checked state from isHidden', () => {
    mockHidden = new Set(['reaction']);
    const tree = render();
    // repost, reaction (hidden), pollVote
    expect(rows(tree).map((r) => r.props.accessibilityState.checked)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('applies cumulative toggles, each flipping only its own row', () => {
    const tree = render();
    const first = rows(tree);
    ReactTestRenderer.act(() => {
      first[0].props.onPress();
    });
    expect(mockToggle).toHaveBeenCalledWith('repost');
    tree.unmount();

    // Re-render against the updated hidden set: repost is now hidden.
    const tree2 = render();
    expect(rows(tree2).map((r) => r.props.accessibilityState.checked)).toEqual([
      false,
      true,
      true,
    ]);
    ReactTestRenderer.act(() => {
      rows(tree2)[1].props.onPress();
    });
    expect(mockToggle).toHaveBeenLastCalledWith('reaction');
    tree2.unmount();

    const tree3 = render();
    expect(rows(tree3).map((r) => r.props.accessibilityState.checked)).toEqual([
      false,
      false,
      true,
    ]);
    tree3.unmount();
  });

  it('omits "Show all types" while nothing is hidden', () => {
    const tree = render();
    expect(showAllRow(tree)).toBeUndefined();
  });

  it('shows "Show all types" when filtered, and clearing unhides everything', () => {
    mockHidden = new Set(['repost', 'pollVote']);
    const tree = render();
    const footer = showAllRow(tree);
    expect(footer).toBeDefined();

    ReactTestRenderer.act(() => {
      footer!.props.onPress();
    });
    expect(mockShowAll).toHaveBeenCalled();
    tree.unmount();

    const tree2 = render();
    expect(showAllRow(tree2)).toBeUndefined();
    expect(rows(tree2).map((r) => r.props.accessibilityState.checked)).toEqual([
      true,
      true,
      true,
    ]);
    tree2.unmount();
  });

  it('mark-all-read passes the active filter as excludeTypes', () => {
    mockHidden = new Set(['repost', 'reaction']);
    const tree = render();
    ReactTestRenderer.act(() => {
      markAllReadButton(tree)!.props.onPress();
    });
    expect(mockMarkAllSeen).toHaveBeenCalledTimes(1);
    // Sorted + comma-joined, exactly as the feed query and server schema expect.
    expect(mockMarkAllSeen).toHaveBeenCalledWith(undefined, {
      excludeTypes: 'reaction,repost',
    });
    tree.unmount();
  });

  it('mark-all-read passes no query params when nothing is filtered', () => {
    const tree = render();
    ReactTestRenderer.act(() => {
      markAllReadButton(tree)!.props.onPress();
    });
    expect(mockMarkAllSeen).toHaveBeenCalledTimes(1);
    expect(mockMarkAllSeen).toHaveBeenCalledWith(undefined, undefined);
    tree.unmount();
  });
});
