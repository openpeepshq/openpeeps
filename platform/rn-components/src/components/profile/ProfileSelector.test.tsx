/**
 * Regression tests for the ProfileSelector sheet title, picker-row tint,
 * selection a11y and id-based selection (issue #1666).
 *
 * The sheet used to hard-code the English string "Add members", so every
 * caller that omitted `title` (jam moderators, group members, event
 * moderators) rendered untranslated copy, and the audience picker could be
 * re-titled to a non-matching string. Web defaults to
 * `profile.selector.title` ("Select profiles"); RN must match.
 *
 * The picker rows also carried no visual selection state, so testers could
 * not see which profiles were picked. NativeWind v4 cannot apply the `/N`
 * opacity modifier to a CSS-variable color, so the tint is built inline via
 * `useThemeOpacity` (`rgba` style) — asserted here as the resolved style
 * value. The tint must use a token that actually contrasts on the sheet:
 * `secondary` is a near-white neutral in the RN palette (web's is the brand
 * teal), so a `secondary` wash is invisible; the selected row uses `primary`
 * at low opacity. The mocked hook is keyed by token so a regression back to
 * `secondary` fails here.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const MESSAGES: Record<string, string> = {
  'profile.selector.title': 'Select profiles',
  // Deliberately NOT the literal ', selected' the old code hard-coded, so
  // this suite fails if the label regresses to a hard-coded English
  // fragment instead of resolving the locale key (issue #1666 review S1).
  'profile.selector.rowSelected': '{{name}} (selected)',
  'profile.search.placeholder': 'Search profiles',
  'profile.search.noResults': 'No results found',
  'common.members.addSuccess': 'Added',
  'common.members.addError': 'Failed',
  'common.members.adding': 'Adding',
  'common.actions.add': 'Add',
};

// Mirrors i18next's default interpolation so the row-label regression test
// can assert the composed, localized screen-reader string (issue #1666
// review S1).
const mockT = (key: string, opts?: { name?: string }) =>
  (MESSAGES[key] ?? key).replace('{{name}}', opts?.name ?? '');

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
  Pressable: (props: Record<string, unknown>) =>
    React.createElement('Pressable', props, props.children),
  ActivityIndicator: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      // Stable array identity: the component's effect depends on `profiles`
      // and a fresh literal each render would loop forever.
      useProfiles: () => ({ data: PROFILES, isLoading: false }),
    },
    currentProfile: null,
  }),
}));

const PROFILES: unknown[] = [];

// Two profile objects; PROFILES[0] is passed as the sheet's initial selection
// so the tint test can compare a selected row against an unselected one.
const ada = { id: 'p1', handle: 'ada', displayName: 'Ada' };
const alan = { id: 'p2', handle: 'alan', displayName: 'Alan' };
PROFILES.push(ada, alan);

jest.mock('../../lib/utils', () => ({
  profileMatchesQuery: () => true,
}));

jest.mock('../icons/index', () => ({
  CheckIcon: () => React.createElement('CheckIcon'),
  SearchIcon: () => React.createElement('SearchIcon'),
}));

jest.mock('../ui/input', () => ({
  Input: () => null,
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement('ThemedText', props, props.children),
}));

jest.mock('../custom/modals/common', () => ({
  BaseSheet: (props: { children?: unknown }) =>
    React.createElement('BaseSheet', null, props.children),
  SheetFooter: () => null,
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

jest.mock('../../theme/useThemeOpacity', () => ({
  // Mirrors the real hook's shape. Values come from theme/defaults.ts so the
  // tint style is asserted deterministically; keyed by token so a regression
  // back to the invisible `secondary` wash fails (issue #1666 review S1).
  useThemeOpacity: () => ({
    background: (name: string, opacity: number) => ({
      backgroundColor:
        name === 'primary'
          ? `rgba(22, 22, 26, ${opacity})`
          : `rgba(244, 244, 245, ${opacity})`,
    }),
  }),
}));

jest.mock('../../lib/bottom-sheet-ref', () => ({
  bottomSheetClose: jest.fn(),
}));

jest.mock('./ProfileCard', () => ({
  MiniProfileCard: (props: Record<string, unknown>) =>
    React.createElement('MiniProfileCard', props),
  ProfileCard: (props: Record<string, unknown>) =>
    React.createElement('ProfileCard', props),
}));

import type { ProfilePickerSheetProps } from './ProfileSelector';
import { ProfileSelector } from './ProfileSelector';

const renderSelector = (props: Partial<ProfilePickerSheetProps> = {}) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ProfileSelector, props as ProfilePickerSheetProps)
    );
  });
  return tree;
};

const titleText = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAllByType('ThemedText')
    .map((node: { props: { children?: unknown } }) => node.props.children)
    .find((child) => typeof child === 'string');

describe('ProfileSelector sheet title (issue #1666)', () => {
  it('falls back to the localized profile.selector.title when no title is passed', () => {
    const tree = renderSelector();
    expect(titleText(tree)).toBe('Select profiles');
  });

  it('uses an explicit title when the caller passes one', () => {
    const tree = renderSelector({ title: 'Add members to Test Group' });
    expect(titleText(tree)).toBe('Add members to Test Group');
  });
});

describe('ProfileSelector selected-row tint (issue #1666)', () => {
  it('tints the selected row with primary at low opacity and leaves the unselected ones clear', () => {
    const tree = renderSelector({
      initialProfiles: [PROFILES[0]] as never,
    });

    const rows = tree.root.findAllByType('Pressable');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const selected = rows.find(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === true
    );
    expect(selected).toBeDefined();
    expect(selected.props.style).toEqual({
      backgroundColor: 'rgba(22, 22, 26, 0.15)',
    });
    const unselected = rows.find(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === false
    );
    expect(unselected).toBeDefined();
    expect(unselected.props.style).toBeUndefined();
  });

  it('marks the rows as accessible buttons with a selected state (web parity)', () => {
    const tree = renderSelector({
      initialProfiles: [PROFILES[0]] as never,
    });

    // Only the selectable rows carry `accessibilityState`; the selected-chip
    // remove buttons (also Pressable) do not, so scope to the rows.
    const rows = tree.root
      .findAllByType('Pressable')
      .filter(
        (node: { props: { accessibilityState?: unknown } }) =>
          node.props.accessibilityState !== undefined
      );
    const selected = rows.filter(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === true
    );
    const unselected = rows.filter(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === false
    );
    expect(selected.length).toBe(1);
    expect(unselected.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.props.accessibilityRole).toBe('button');
      expect(typeof row.props.accessibilityLabel).toBe('string');
      expect(row.props.accessibilityLabel.length).toBeGreaterThan(0);
    }
    expect(selected[0].props.accessibilityLabel).toContain('selected');
  });

  it('builds the selected-row label from the profile.selector.rowSelected locale key (issue #1666 review S1)', () => {
    // The label must come from a t() key, not a hard-coded English fragment:
    // the mock t() resolves the key and interpolates {{name}}, so a
    // regression to a literal ", selected" concatenation would skip the key
    // entirely and leave the label with no interpolation.
    const tree = renderSelector({
      initialProfiles: [PROFILES[0]] as never,
    });
    const rows = tree.root
      .findAllByType('Pressable')
      .filter(
        (node: { props: { accessibilityState?: unknown } }) =>
          node.props.accessibilityState !== undefined
      );
    const selected = rows.find(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === true
    );
    const unselected = rows.find(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === false
    );
    expect(selected.props.accessibilityLabel).toBe('Ada (selected)');
    expect(unselected.props.accessibilityLabel).toBe('Alan');
  });
});

describe('ProfileSelector id-based selection (issue #1666 review S3)', () => {
  it('keeps the selection when the caller re-seeds with a fresh object of the same id', () => {
    // A re-mounted sheet (or upstream object churn) seeds `initialProfiles`
    // with a new object; reference equality would drop the selection, so the
    // row must still render selected for the matching id.
    const freshAda = { id: 'p1', handle: 'ada', displayName: 'Ada' };
    const tree = renderSelector({ initialProfiles: [freshAda] as never });

    const rows = tree.root.findAllByType('Pressable');
    const selected = rows.filter(
      (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
        node.props.accessibilityState?.selected === true
    );
    expect(selected.length).toBe(1);
  });
});
