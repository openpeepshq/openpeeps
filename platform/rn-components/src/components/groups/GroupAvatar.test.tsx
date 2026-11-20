/**
 * Regression tests for the GroupAvatar loading-gap fix (issue #1666, round-4
 * review item 2).
 *
 * A group avatar that is still downloading — or permanently, when the media
 * cache cannot produce the file — must keep the slot filled with the same
 * sized initials tile as a no-avatar group, instead of leaving an empty box
 * that reads as a misaligned avatar. The image branch renders the tile
 * behind the image (tile first in tree order), so the guarantee is uniform
 * with ProfileAvatar.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Mocked element types, shared with the jest.mock factories below so tests can
// assert tree order by reference instead of by string name. The tile's style
// (backgroundColor / fontSize) is forwarded so the underlay's actual styling
// can be pinned, not just its presence and tree position.
const MockView = (props: {
  children?: unknown;
  className?: string;
  style?: unknown;
}) =>
  React.createElement(
    'View',
    { className: props.className, style: props.style },
    props.children
  );
const MockText = (props: {
  children?: unknown;
  className?: string;
  style?: unknown;
}) =>
  React.createElement(
    'Text',
    { className: props.className, style: props.style },
    props.children
  );
const MockAvatar = (props: { children?: unknown; className?: string }) =>
  React.createElement('Avatar', { className: props.className }, props.children);
const MockAvatarImage = (props: { source?: unknown; className?: string }) =>
  React.createElement('AvatarImage', { source: props.source });

jest.mock('react-native', () => ({
  View: MockView,
  Text: MockText,
}));

jest.mock('@openpeepshq/common', () => ({
  // Only the runtime helper is needed; `Group` is a type-only import.
  getGroupAvatar: (
    group: { avatar?: string | null } | null | undefined,
    _config: unknown
  ) => group?.avatar,
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: { useServerInfo: () => ({ data: { communityConfig: {} } }) },
  }),
  // Real source for the initials fallback (first + last name initial).
  getInitials: require('../../../../react/src/lib/initialsAvatar').getInitials,
  hueFromHandle: () => 180,
  initialsBackground: () => 'rgb(20, 20, 20)',
}));

jest.mock('../../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({ isDark: false }),
}));

jest.mock('../ui/avatar', () => ({
  Avatar: MockAvatar,
  AvatarImage: MockAvatarImage,
}));

jest.mock('../../lib/utils', () => ({
  cn: (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' '),
}));

import type { Group } from '@openpeepshq/common';
import { GroupAvatar } from './GroupAvatar';

const baseGroup = {
  id: 'g1',
  handle: 'ada-group',
  displayName: 'Ada Group',
} as unknown as Group;

const renderGroupAvatar = (group: Group, className?: string) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(GroupAvatar, { group, className })
    );
  });
  return tree;
};

const initialsText = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAllByType(MockText)
    .map((node: { props: { children?: unknown } }) => node.props.children)
    .find((child) => typeof child === 'string');

// The underlay tile is the View carrying the initialsBackground color.
const findTile = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAllByType(MockView)
    .find(
      (node: { props: { style?: { backgroundColor?: string } } }) =>
        typeof node.props.style?.backgroundColor === 'string'
    );

// The tile's single child is the initials Text (not an array).
const tileFontSize = (tree: ReturnType<typeof ReactTestRenderer.create>) => {
  const child = findTile(tree)?.props?.children;
  return (Array.isArray(child) ? child[0] : child)?.props?.style?.fontSize;
};

describe('GroupAvatar loading-gap fix (issue #1666 round-4 review item 2)', () => {
  it('renders the initials tile behind the image while the group avatar is still loading', () => {
    const tree = renderGroupAvatar({
      ...baseGroup,
      avatar: 'https://cdn.example/groups/ada-group.png',
    });
    const avatar = tree.root.findByType('Avatar');
    expect(initialsText(tree)).toBe('AG');
    expect(avatar.findAllByType(MockAvatarImage)).toHaveLength(1);
    const childTypes = avatar.children.map(
      (child: { type?: unknown }) => child.type
    );
    expect(childTypes[0]).toBe(MockView);
    expect(childTypes[childTypes.length - 1]).toBe(MockAvatarImage);
  });

  it('renders the initials tile standalone when the group has no avatar', () => {
    const tree = renderGroupAvatar(baseGroup);
    const avatar = tree.root.findByType('Avatar');
    expect(initialsText(tree)).toBe('AG');
    expect(avatar.findAllByType(MockAvatarImage)).toHaveLength(0);
    const childTypes = avatar.children.map(
      (child: { type?: unknown }) => child.type
    );
    expect(childTypes).toEqual([MockView]);
  });

  it('pins the underlay style: tile background from initialsBackground and size-derived fontSize (issue #1666 round-20 #1/#3)', () => {
    // Default (no size class) → 64dp box → fontSize 24; background is the
    // real initialsBackground output for the mocked hue.
    const tree = renderGroupAvatar(baseGroup);
    expect(findTile(tree)?.props.style?.backgroundColor).toBe(
      'rgb(20, 20, 20)'
    );
    expect(tileFontSize(tree)).toBe(24);
  });

  it('scales the tile fontSize with the requested size, including non-bucket sizes (issue #1666 round-20 #3)', () => {
    // size-8 → 32dp → 12 (was the 14px bucket before round-20 #4), size-24 →
    // 96dp → 36, w-12 h-12 → 48dp → 18, and a non-bucket size-14 → 56dp → 21.
    expect(tileFontSize(renderGroupAvatar(baseGroup, 'size-8'))).toBe(12);
    expect(tileFontSize(renderGroupAvatar(baseGroup, 'size-24'))).toBe(36);
    expect(tileFontSize(renderGroupAvatar(baseGroup, 'w-12 h-12'))).toBe(18);
    expect(tileFontSize(renderGroupAvatar(baseGroup, 'size-14'))).toBe(21);
  });
});
