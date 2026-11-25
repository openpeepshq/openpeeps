/**
 * Layout contract for the RN `ReplyBox` composer (issue #2200): the profile
 * avatar is pinned to the web composer's 40 dp size (`size-10`, matching the
 * web `size={2.5}` / 2.5 rem) and can never be compressed by the row, and the
 * row keeps its centered alignment, `border-b-2` underline and the `pb-6`
 * bottom separation that clears the event tab bar's `border-b` hairline.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let mockCurrentProfile: Record<string, unknown> | undefined = {
  id: 'me',
  displayName: 'Me',
  handle: 'me',
};

jest.mock('react-native', () => ({
  Pressable: (props: {
    children?: unknown;
    className?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
  }) =>
    React.createElement(
      'Pressable',
      {
        className: props.className,
        onPress: props.onPress,
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: props.accessibilityRole,
      },
      props.children
    ),
  View: (props: { className?: string; children?: unknown }) =>
    React.createElement('View', { className: props.className }, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => mockCurrentProfile,
  useReplyOpener: () => jest.fn(),
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: (props: Record<string, unknown>) =>
    React.createElement('ProfileAvatar', props),
}));

jest.mock('../icons/index', () => ({
  ImageIcon: (props: Record<string, unknown>) =>
    React.createElement('ImageIcon', props),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement('ThemedText', null, props.children),
}));

import type { ReactElement } from 'react';
import { ReplyBox } from './ReplyBox';

const makePost = () => ({ id: 'post-1' }) as never;

const render = (element: ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

test('a signed-in composer renders the reply button with the web-matched avatar size', () => {
  const tree = render(<ReplyBox post={makePost()} />);
  const pressable = tree.root.findByType('Pressable');
  expect(pressable.props.accessibilityRole).toBe('button');
  expect(pressable.props.accessibilityLabel).toBe('posts.replyBox.reply');

  // The avatar is pinned to the web composer's 40 dp size and can never be
  // compressed by the flex row (the un-sized fallback was 64 dp, the root
  // cause of the overlap with the tab bar's bottom border).
  const avatar = tree.root.findByType('ProfileAvatar');
  expect(avatar.props.className).toContain('size-10');
  expect(avatar.props.className).toContain('shrink-0');

  // The row keeps its web-mirrored alignment and underline, plus the bottom
  // separation that clears the event tab bar's border above it.
  const cls = pressable.props.className as string;
  expect(cls).toContain('items-center');
  expect(cls).toContain('gap-x-2');
  expect(cls).toContain('border-b-2');
  expect(cls).toContain('pb-6');
  ReactTestRenderer.act(() => tree.unmount());
});

test('a logged-out visitor renders nothing (native has no browse mode)', () => {
  mockCurrentProfile = undefined;
  const tree = render(<ReplyBox post={makePost()} />);
  expect(tree.toJSON()).toBeNull();
  ReactTestRenderer.act(() => tree.unmount());
});
