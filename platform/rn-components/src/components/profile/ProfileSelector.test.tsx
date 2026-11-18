/**
 * Regression tests for the ProfileSelector sheet title (issue #1666).
 *
 * The sheet used to hard-code the English string "Add members", so every
 * caller that omitted `title` (jam moderators, group members, event
 * moderators) rendered untranslated copy, and the audience picker could be
 * re-titled to a non-matching string. Web defaults to
 * `profile.selector.title` ("Select profiles"); RN must match.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const mockT = (key: string) => MESSAGES[key] ?? key;

const MESSAGES: Record<string, string> = {
  'profile.selector.title': 'Select profiles',
  'profile.search.placeholder': 'Search profiles',
  'profile.search.noResults': 'No results found',
  'common.members.addSuccess': 'Added',
  'common.members.addError': 'Failed',
  'common.members.adding': 'Adding',
  'common.actions.add': 'Add',
};

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
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

jest.mock('../../lib/bottom-sheet-ref', () => ({
  bottomSheetClose: jest.fn(),
}));

jest.mock('./ProfileCard', () => ({
  MiniProfileCard: () => null,
  ProfileCard: () => null,
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
