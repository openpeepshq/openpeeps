/**
 * Regression tests for the NewConversation candidate rows
 * (issue #1666 review S3, round-10 review S1).
 *
 * The row list is refiltered on every search keystroke, so keying rows by
 * array index remounts them across filter boundaries (state loss, wasted
 * work). The sibling selected-chips block keys by `profile.id`; the rows
 * must do the same.
 *
 * The candidate rows are also the one picker surface rendered as *bare*
 * `ProfileCard` rows — no accessible wrapper. They must carry their own
 * screen-reader identity (role/label/state), or the whole DM picker is
 * invisible to screen readers (round-10 review S1).
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const MESSAGES: Record<string, string> = {
  // Mirrors ProfileSelector.test — deliberately not the raw key, so a
  // regression that skips the t() lookup (or the interpolation) fails.
  'profile.selector.rowSelected': '{{name}} (selected)',
  // Pluralized selection-count caption (plan step 4). Distinct per plural so a
  // regression that drops the count or the plural form fails (round-11 S3).
  'conversations.createNew.selectedCount_one': '{{count}} selected',
  'conversations.createNew.selectedCount_other': '{{count}} selected',
  // Plan step 4 page-header title and search placeholder (round-12 S1/S2).
  // Pinned to the en.json values so a regression to a different key or a
  // hard-coded string fails.
  'conversations.createNew.title': 'New Conversation',
  'conversations.createNew.searchPlaceholder': 'Search for people',
};

const mockT = (key: string, opts?: { name?: string; count?: number }) => {
  // Emulate i18next pluralization: a `count` option resolves `key` to
  // `key_one` / `key_other` (used by the selection-count caption).
  const count = opts?.count;
  const pluralKey =
    typeof count === 'number' ? `${key}_${count === 1 ? 'one' : 'other'}` : key;
  return (MESSAGES[pluralKey] ?? key)
    .replace('{{name}}', opts?.name ?? '')
    .replace('{{count}}', String(count ?? ''));
};

const ada = { id: 'p1', handle: 'ada', displayName: 'Ada' };
const alan = { id: 'p2', handle: 'alan', displayName: 'Alan' };
const PROFILES = [ada, alan];

// The store mock returns this array by reference, so the a11y test mutates
// it in place (reassigning the outer variable would not propagate — the
// factory captured the array once at first import).
const memberStore: unknown[] = [];

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  ActivityIndicator: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: unknown }) =>
    React.createElement('KeyboardAwareScrollView', null, props.children),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfiles: () => ({ data: PROFILES, isLoading: false }),
    },
    currentProfile: null,
  }),
}));

jest.mock('@openpeepshq/common/lib', () => ({
  blockedPairIds: () => [],
}));

jest.mock('../../lib/utils', () => ({
  profileMatchesQuery: () => true,
}));

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: (props: { children?: unknown }) =>
    React.createElement('ThemedView', null, props.children),
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../components/ui/input', () => ({
  // Passes props through (like the other stubs) so the search Input's
  // placeholder is assertable (round-12 S2).
  Input: (props: Record<string, unknown>) =>
    React.createElement('Input', props),
}));

jest.mock('../../components/icons/index', () => ({
  CheckIcon: () => React.createElement('CheckIcon'),
}));

// Shared jest.fn (not a fresh one per call) so the page-header assertion can
// read the captured title (round-12 S1).
const setPageHeaderSpy = jest.fn();

jest.mock('../../components/layout', () => ({
  HeaderActionButton: () => null,
  useSetPageHeader: (...args: unknown[]) => setPageHeaderSpy(...args),
}));

jest.mock('../../components/custom/common/index', () => ({
  EmptyStateContainer: () => null,
}));

jest.mock('../../stores/useNewConversationStore', () => ({
  useNewConversationStore: () => ({
    members: memberStore,
    setMember: jest.fn(),
    removeMember: jest.fn(),
  }),
}));

jest.mock('../../components/profile/index', () => ({
  ProfileCard: (props: Record<string, unknown>) =>
    React.createElement('ProfileCard', props),
  MiniProfileCard: (props: Record<string, unknown>) =>
    React.createElement('MiniProfileCard', props),
}));

import { NewConversation } from './New';

const renderPage = () => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(NewConversation, {
        navigation: { navigate: jest.fn() },
      } as never)
    );
  });
  return tree;
};

const rowsOf = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAll(
    (node: { type?: { name?: string } }) =>
      typeof node.type === 'function' && node.type.name === 'ProfileCard'
  );

describe('NewConversation row keying (issue #1666 review S3)', () => {
  it('keys the profile rows by profile.id, not array index', () => {
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(NewConversation, {
          navigation: { navigate: jest.fn() },
        } as never)
      );
    });
    // React strips keys from the public TestInstance / toJSON output; the
    // key only lives on the fiber, so read it from there. Match the mock
    // component itself (the object-literal shorthand names it
    // `ProfileCard`), not the string-typed element it returns. With the
    // fixed `key={profile.id}` this is the profile id; the old
    // `key={index}` would yield "0"/"1" and fail.
    const rowKeys = tree.root
      .findAll(
        (node: { type?: { name?: string } }) =>
          typeof node.type === 'function' && node.type.name === 'ProfileCard'
      )
      .map(
        (node: { _currentFiber: () => { key: string } }) =>
          node._currentFiber().key
      );
    expect(rowKeys).toEqual(['p1', 'p2']);
  });

  it('gives the bare candidate rows their own screen-reader identity (issue #1666 round-10 S1)', () => {
    // The rows are not wrapped in an accessible element, so the a11y must
    // reach the ProfileCard itself. Mark one profile selected (in place —
    // the store mock holds the array by reference) and assert each row
    // carries a button role, a non-empty localized label, and a selected
    // state that matches its membership.
    memberStore.push(ada);
    try {
      let tree: ReturnType<typeof ReactTestRenderer.create>;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          React.createElement(NewConversation, {
            navigation: { navigate: jest.fn() },
          } as never)
        );
      });
      const rows = tree.root.findAll(
        (node: { type?: { name?: string } }) =>
          typeof node.type === 'function' && node.type.name === 'ProfileCard'
      );
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.props.accessibilityRole).toBe('button');
        expect(typeof row.props.accessibilityLabel).toBe('string');
        expect(row.props.accessibilityLabel.length).toBeGreaterThan(0);
        expect(typeof row.props.accessibilityState?.selected).toBe('boolean');
      }
      // The selected row composes its label through the locale key with the
      // profile name interpolated; the unselected row uses the plain name.
      const selected = rows.find(
        (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
          node.props.accessibilityState?.selected === true
      );
      const unselected = rows.find(
        (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
          node.props.accessibilityState?.selected === false
      );
      expect(selected?.props.accessibilityLabel).toBe('Ada (selected)');
      expect(unselected?.props.accessibilityLabel).toBe('Alan');
    } finally {
      memberStore.length = 0;
    }
  });
});

// The caption is the page's only `ThemedText` (every other string goes
// through a mocked component), so the first ThemedText is the selection-count
// caption when it renders at all.
const caption = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAllByType('ThemedText')[0]?.props.children;

describe('NewConversation selection-count caption (issue #1666 round-11 S3)', () => {
  it('renders the localized selectedCount caption with the count interpolated', () => {
    // The mock t() resolves the plural key and interpolates {{count}}, so a
    // regression that drops the count (or skips the t() lookup and renders
    // the raw key) fails here.
    memberStore.push(ada, alan);
    try {
      expect(caption(renderPage())).toBe('2 selected');
    } finally {
      memberStore.length = 0;
    }
  });

  it('resolves the singular plural form for exactly one selection', () => {
    memberStore.push(ada);
    try {
      expect(caption(renderPage())).toBe('1 selected');
    } finally {
      memberStore.length = 0;
    }
  });

  it('renders no caption when nothing is selected', () => {
    const tree = renderPage();
    expect(caption(tree)).toBeUndefined();
    expect(tree.root.findAllByType('ThemedText')).toHaveLength(0);
  });
});

describe('NewConversation candidate-row label strings (issue #1666 round-11 S4)', () => {
  const labelOf = (
    rows: Array<{
      props: {
        accessibilityState?: { selected?: boolean };
        accessibilityLabel?: string;
      };
    }>,
    selected: boolean
  ) =>
    rows.find((row) => row.props.accessibilityState?.selected === selected)
      ?.props.accessibilityLabel;

  it('composes the exact localized screen-reader string, selected and unselected', () => {
    // Pinned via the key-resolution mock (mirrors ProfileSelector.test): the
    // selected label is the resolved profile.selector.rowSelected string with
    // the name interpolated, the unselected label is the plain name — so a
    // regression to a hard-coded English fragment or a missing t() lookup fails.
    memberStore.push(ada);
    try {
      const rows = rowsOf(renderPage());
      expect(labelOf(rows, true)).toBe('Ada (selected)');
      expect(labelOf(rows, false)).toBe('Alan');
    } finally {
      memberStore.length = 0;
    }
  });

  it('falls back to the handle when a profile has no display name', () => {
    // New.tsx composes `displayName || \`@${handle}\`` for both the plain and
    // the selected label; a profile with no displayName must yield the handle
    // in both states.
    const carl = { id: 'p3', handle: 'carl' };
    PROFILES.push(carl);
    memberStore.push(carl);
    try {
      const findRow = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
        rowsOf(tree).find(
          (row) =>
            (row.props as { profile: { handle: string } }).profile.handle ===
            'carl'
        );
      // Selected: label is the localized key with the handle interpolated.
      expect(findRow(renderPage())?.props.accessibilityLabel).toBe(
        '@carl (selected)'
      );
      // Unselected (no one selected): the row falls back to the plain handle.
      memberStore.length = 0;
      const plainRow = findRow(renderPage());
      expect(plainRow?.props.accessibilityState?.selected).toBe(false);
      expect(plainRow?.props.accessibilityLabel).toBe('@carl');
    } finally {
      memberStore.length = 0;
      PROFILES.pop();
    }
  });
});

describe('NewConversation page chrome (issue #1666 round-12 S1/S2)', () => {
  it('sets the page header title via conversations.createNew.title (plan step 4)', () => {
    // The captured title is the resolved locale value; the old header used
    // the nonexistent conversations.selectMembers key, which silently fell
    // back to its defaultValue — a regression to that key (or any other)
    // fails on the resolved string.
    renderPage();
    expect(setPageHeaderSpy).toHaveBeenCalled();
    expect(setPageHeaderSpy.mock.calls.at(-1)?.[0]).toBe('New Conversation');
  });

  it('passes the localized search placeholder to the search Input (plan step 4)', () => {
    // The Input stub passes props through, so the rendered Input carries the
    // resolved placeholder; a regression to the old hard-coded
    // "Enter name or handle" fails.
    const tree = renderPage();
    const input = tree.root.findAllByType('Input')[0];
    expect(input?.props.placeholder).toBe('Search for people');
  });
});
