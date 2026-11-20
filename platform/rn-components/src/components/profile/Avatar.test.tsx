/**
 * Regression tests for the ProfileAvatar SVG-derivation fix
 * (issue #1666, round-2 plan step 2 / round-10 review S2).
 *
 * `svgCoverSrc` appends a web-only `#svgView(...)` cover fragment to the
 * URI, so the SVG-vs-raster path must be decided from the *original*
 * `profile.avatar` URL — never from the `svgCoverSrc` output — or an SVG
 * avatar silently falls back to the raster `AvatarImage`, which RN `Image`
 * cannot decode. The `isSvgUrl`/`svgCoverSrc` helpers are the real source
 * (mapped through the repo's Jest source convention), so this suite fails
 * if the path-selection moves to the fragment-appended URL or the deleted /
 * no-avatar fallbacks regress.
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
const MockSvgImage = (props: { uri?: string; className?: string }) =>
  React.createElement('SvgImage', {
    uri: props.uri,
    className: props.className,
  });

jest.mock('react-native', () => ({
  View: MockView,
  Text: MockText,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@openpeepshq/common', () => ({
  // Only the runtime helper is needed; `Profile` is a type-only import.
  isDeletedProfile: (p: { deletedAt?: string | null }) => !!p?.deletedAt,
}));

jest.mock('@openpeepshq/react', () => ({
  // Real source for the URL helpers — the regression is precisely about how
  // they combine, so stubbing them would hide the very thing under test.
  isSvgUrl: require('../../../../react/src/lib/svgCover').isSvgUrl,
  svgCoverSrc: require('../../../../react/src/lib/svgCover').svgCoverSrc,
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
  AvatarFallback: () => null,
  AvatarImage: MockAvatarImage,
}));

jest.mock('../ui/svg-image', () => ({
  SvgImage: MockSvgImage,
}));

jest.mock('../icons/index', () => ({
  UserXIcon: (props: { className?: string }) =>
    React.createElement('UserXIcon', { className: props.className }),
}));

jest.mock('../../lib/utils', () => ({
  cn: (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' '),
}));

import type { Profile } from '@openpeepshq/common';
import { ProfileAvatar } from './Avatar';

const baseProfile = {
  id: 'p1',
  handle: 'ada',
  displayName: 'Ada Lovelace',
} as unknown as Profile;

const renderAvatar = (profile: Profile) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ProfileAvatar, { profile, className: 'size-10' })
    );
  });
  return tree;
};

describe('ProfileAvatar SVG path selection (issue #1666 round-2 plan step 2)', () => {
  it('renders an SVG avatar via SvgImage with cover, not the raster AvatarImage', () => {
    const tree = renderAvatar({
      ...baseProfile,
      avatar: 'https://cdn.example/avatars/ada.svg',
    });
    const svg = tree.root.findByType('SvgImage');
    // The URI is the cover-appended source (what web renders), while the
    // path choice itself must not depend on that fragment.
    expect(svg.props.uri).toBe(
      'https://cdn.example/avatars/ada.svg#svgView(preserveAspectRatio(xMidYMid slice))'
    );
    expect(svg.props.className).toContain('rounded-full');
    expect(tree.root.findAllByType('AvatarImage')).toHaveLength(0);
  });

  it('renders a raster avatar via AvatarImage, not SvgImage', () => {
    const tree = renderAvatar({
      ...baseProfile,
      avatar: 'https://cdn.example/avatars/ada.png',
    });
    const image = tree.root.findByType('AvatarImage');
    expect(image.props.source).toEqual({
      uri: 'https://cdn.example/avatars/ada.png',
    });
    expect(tree.root.findAllByType('SvgImage')).toHaveLength(0);
  });

  it('falls back to the deleted icon for a deleted profile that still has an avatar URL', () => {
    const tree = renderAvatar({
      ...baseProfile,
      avatar: 'https://cdn.example/avatars/ada.svg',
      deletedAt: '2026-01-01T00:00:00Z',
    });
    expect(tree.root.findAllByType('SvgImage')).toHaveLength(0);
    expect(tree.root.findAllByType('AvatarImage')).toHaveLength(0);
    expect(tree.root.findByType('UserXIcon')).toBeDefined();
  });

  it('falls back to the initials tile when the profile has no avatar', () => {
    const tree = renderAvatar(baseProfile);
    expect(tree.root.findAllByType('SvgImage')).toHaveLength(0);
    expect(tree.root.findAllByType('AvatarImage')).toHaveLength(0);
    expect(tree.root.findAllByType('UserXIcon')).toHaveLength(0);
    const initials = tree.root
      .findAllByType('Text')
      .map((node: { props: { children?: unknown } }) => node.props.children)
      .find((child) => typeof child === 'string');
    expect(initials).toBe('AL');
  });

  it('renders the initials tile under the SVG image (issue #1666 round-3)', () => {
    // Both children must render simultaneously, with the tile first in tree
    // order so a loaded SvgImage paints over it (a re-order, or a condition
    // that hides the image, must fail this test).
    const tree = renderAvatar({
      ...baseProfile,
      avatar: 'https://cdn.example/avatars/ada.svg',
    });
    const avatar = tree.root.findByType('Avatar');
    const initials = tree.root
      .findAllByType('Text')
      .map((node: { props: { children?: unknown } }) => node.props.children)
      .find((child) => typeof child === 'string');
    expect(initials).toBe('AL');
    expect(avatar.findAllByType(MockSvgImage)).toHaveLength(1);
    const childTypes = avatar.children.map(
      (child: { type?: unknown }) => child.type
    );
    expect(childTypes[0]).toBe(MockView);
    expect(childTypes[childTypes.length - 1]).toBe(MockSvgImage);
  });

  it('renders the initials tile under the raster image (issue #1666 round-3)', () => {
    // Both children must render simultaneously, with the tile first in tree
    // order so a loaded AvatarImage paints over it (a re-order, or a
    // condition that hides the image, must fail this test).
    const tree = renderAvatar({
      ...baseProfile,
      avatar: 'https://cdn.example/avatars/ada.png',
    });
    const avatar = tree.root.findByType('Avatar');
    const initials = tree.root
      .findAllByType('Text')
      .map((node: { props: { children?: unknown } }) => node.props.children)
      .find((child) => typeof child === 'string');
    expect(initials).toBe('AL');
    expect(avatar.findAllByType(MockAvatarImage)).toHaveLength(1);
    const childTypes = avatar.children.map(
      (child: { type?: unknown }) => child.type
    );
    expect(childTypes[0]).toBe(MockView);
    expect(childTypes[childTypes.length - 1]).toBe(MockAvatarImage);
  });

  it('pins the underlay style: tile background from initialsBackground and size-derived fontSize (issue #1666 round-20 #1)', () => {
    // The loading-gap symptom is invisible-if-unstyled: a refactor that drops
    // the tile's style must fail here. size-10 → 40dp → fontSize 15, and the
    // background is the real initialsBackground output for the mocked hue.
    const tree = renderAvatar({
      ...baseProfile,
      avatar: 'https://cdn.example/avatars/ada.png',
    });
    const tile = tree.root
      .findAllByType(MockView)
      .find((node) => typeof node.props.style?.backgroundColor === 'string');
    expect(tile.props.style.backgroundColor).toBe('rgb(20, 20, 20)');
    // The tile's single child is the initials Text (not an array).
    const text = Array.isArray(tile.props.children)
      ? tile.props.children[0]
      : tile.props.children;
    expect(text.props.style.fontSize).toBe(15);
  });
});
