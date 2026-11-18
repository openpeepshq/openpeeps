/**
 * Regression tests for the GroupMembersList row geometry (issue #1666).
 *
 * The member row must mirror the web list's geometry: a 48 dp avatar slot
 * (`size-12`, matching web's `Avatar size={3}`) and the standard `p-4` row
 * padding. A previous pass shrank the avatar to `size-10` and cut the row
 * padding to `py-2 pl-4 pr-1`, which moved the avatar away from web parity
 * and shrank the dropdown-menu trigger's hit target.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', props, props.children),
  Pressable: (props: { children?: unknown }) =>
    React.createElement('Pressable', props, props.children),
  ActivityIndicator: () => null,
  TextInput: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@openpeepshq/common/lib', () => ({
  // Mirrored from platform/common/src/lib — the built package ships ESM
  // which Jest's node transform doesn't cover.
  canChangeMemberRole: () => false,
  canRemoveMember: () => false,
  matchesQuery: () => true,
  sortGroupMembers: (members: unknown) => members,
  truncateText: (text: string) => text,
}));

jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => null,
  useOpenpeeps: () => ({
    openpeepsApi: {
      useGroupMembers: () => ({ data: MEMBERS, isLoading: false }),
    },
  }),
}));

jest.mock('../conversations/CreateNewConversationContext', () => ({
  useCreateNewConversation: () => ({ openCreateConversation: jest.fn() }),
}));

jest.mock('../icons/index', () => ({
  MessageSquareTextIcon: () => React.createElement('Icon'),
  MoreHorizontalIcon: () => React.createElement('Icon'),
  UserCogIcon: () => React.createElement('Icon'),
  UserMinusIcon: () => React.createElement('Icon'),
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: (props: Record<string, unknown>) =>
    React.createElement('ProfileAvatar', props),
}));

jest.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: (props: { children?: unknown }) =>
    React.createElement('DropdownMenu', null, props.children),
  DropdownMenuContent: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuContent', null, props.children),
  DropdownMenuGroup: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuGroup', null, props.children),
  DropdownMenuItem: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuItem', null, props.children),
  DropdownMenuTrigger: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuTrigger', null, props.children),
}));

jest.mock('../ui/input', () => ({ Input: () => null }));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement('ThemedText', props, props.children),
}));

jest.mock('../../theme/useThemeOpacity', () => ({
  useThemeOpacity: () => ({
    themeOpacity: 1,
    setThemeOpacity: jest.fn(),
  }),
}));

jest.mock('./ChangeGroupRolesModal', () => ({
  ChangeGroupRolesModal: () => null,
}));

jest.mock('./ConfirmMemberRemovalModal', () => ({
  ConfirmMemberRemovalModal: () => null,
}));

import type { GroupMembersListProps } from './GroupMembersList';
import { GroupMembersList } from './GroupMembersList';

const MEMBERS = [
  {
    profile: {
      id: 'p1',
      handle: 'ada.example',
      displayName: 'Ada Lovelace',
    },
    roles: [],
  },
];

const group = {
  id: 'g1',
  name: 'Test Group',
} as unknown as GroupMembersListProps['group'];

const renderList = () => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(GroupMembersList, { group })
    );
  });
  return tree;
};

describe('GroupMembersList row geometry (issue #1666)', () => {
  it('renders the member avatar at web parity (size-12 = 48 dp, web Avatar size={3})', () => {
    const tree = renderList();
    const avatar = tree.root
      .findAllByType('ProfileAvatar')
      .find(
        (node: { props: { className?: string } }) =>
          typeof node.props.className === 'string'
      );
    expect(avatar).toBeDefined();
    expect(avatar.props.className).toContain('size-12');
  });

  it('keeps the standard p-4 row padding so the menu trigger keeps its hit target', () => {
    const tree = renderList();
    const rows = tree.root
      .findAllByType('View')
      .filter(
        (node: { props: { className?: string } }) =>
          typeof node.props.className === 'string' &&
          node.props.className.includes('border-b')
      );
    expect(rows.length).toBe(1);
    expect(rows[0].props.className).toContain('p-4');
    expect(rows[0].props.className).not.toContain('pr-1');
  });
});
