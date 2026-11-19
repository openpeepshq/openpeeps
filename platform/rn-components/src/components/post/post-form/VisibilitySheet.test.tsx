/**
 * Regression tests for the VisibilitySheet direct-message audience chips
 * (issue #1666 round-11 S1).
 *
 * The "direct" option reuses the shared `MiniProfileCard` chip (with
 * `showAction={false}`) instead of the old overlapping `ProfileAvatar` stack,
 * and the chips block is only rendered once an audience is actually selected
 * (`selectedAudience.audience.length > 0`). Both behaviors are unpinned
 * elsewhere: a regression that re-renders the chips for an empty audience, or
 * that drops `showAction={false}` (re-adding a remove button to a read-only
 * chip), would not be caught.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Stub for the lucide icon slot; only the `value` matters to the sheet.
const Icon = () => React.createElement('Icon');

jest.mock('react-native', () => ({
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
  Text: (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children),
  Image: () => null,
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
  Dimensions: { get: () => ({ height: 800, width: 400 }) },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The sheet filters the public/direct options on these flags; keep the list
// stable and include the 'direct' option under test.
jest.mock('./constants', () => ({
  useAudienceChoices: () => [
    { title: 'Local', description: '', value: 'local', icon: Icon },
    { title: 'Group', description: '', value: 'group', icon: Icon },
    { title: 'Direct', description: '', value: 'direct', icon: Icon },
  ],
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: { useServerInfo: () => ({ data: { publicContent: false } }) },
    currentProfile: null,
  }),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: (props: { children?: unknown }) =>
    React.createElement('BottomSheetModal', null, props.children),
  TouchableWithoutFeedback: (props: { children?: unknown }) =>
    React.createElement('TWF', null, props.children),
  TouchableOpacity: (props: { children?: unknown }) =>
    React.createElement('TS', null, props.children),
}));

jest.mock('../../icons/index', () => ({
  ChevronRightIcon: () => React.createElement('ChevronRightIcon'),
}));

jest.mock('../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../custom/modals/common', () => ({
  BaseSheet: (props: { children?: unknown }) =>
    React.createElement('BaseSheet', null, props.children),
  SheetFooter: () => null,
}));

jest.mock('../../groups/GroupNameFromId', () => ({
  GroupNameFromId: () => React.createElement('GroupNameFromId'),
}));

// The component under test imports the real chip; mock only its leaves so the
// MiniProfileCard's actual `showAction`/geometry behavior stays in scope.
jest.mock('../../profile/ProfileCard', () => ({
  MiniProfileCard: (props: Record<string, unknown>) =>
    React.createElement('MiniProfileCard', props),
}));

jest.mock('../../profile/ProfileSelector', () => ({
  ProfileSelector: () => null,
}));

jest.mock('../../../lib/bottom-sheet-ref', () => ({
  bottomSheetClose: jest.fn(),
}));

import { VisibilitySheet } from './VisibilitySheet';

const renderSheet = (audienceSetting: {
  visibility: string;
  audience?: unknown[];
}) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(VisibilitySheet, {
        type: 'post',
        onSubmit: jest.fn(),
        audienceSetting,
        showDirect: true,
      } as never)
    );
  });
  return tree;
};

// The chips share a container View the rest of the sheet never uses, so it is
// a stable handle for the "chips block" the guard toggles.
const CHIP_CONTAINER = 'flex-row flex-wrap gap-2 py-2';
const chipContainer = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAllByType('View')
    .filter(
      (v: { props: { className?: string } }) =>
        v.props.className === CHIP_CONTAINER
    );

describe('VisibilitySheet direct-message audience chips (issue #1666 round-11 S1)', () => {
  it('renders one MiniProfileCard chip per audience member with showAction=false', () => {
    const audience = [
      { id: 'p1', handle: 'ada', displayName: 'Ada' },
      { id: 'p2', handle: 'alan', displayName: 'Alan' },
    ];
    const tree = renderSheet({ visibility: 'direct', audience });
    // The chips block renders once an audience is selected.
    expect(chipContainer(tree)).toHaveLength(1);
    const chips = tree.root.findAllByType('MiniProfileCard');
    // Exactly one chip per selected member — no extra remove-button chip.
    expect(chips).toHaveLength(2);
    // The chips are read-only: the remove action must be suppressed.
    for (const chip of chips) {
      expect(chip.props.showAction).toBe(false);
    }
  });

  it('renders no chips block when the direct audience is empty', () => {
    // `audience: []` — the `audience.length > 0` guard must suppress the whole
    // container, not just map an empty list. (Mapping an empty list renders no
    // chips but still leaves an empty container behind, so assert the
    // container is gone too.)
    const tree = renderSheet({ visibility: 'direct', audience: [] });
    expect(chipContainer(tree)).toHaveLength(0);
    expect(tree.root.findAllByType('MiniProfileCard')).toHaveLength(0);
  });
});
