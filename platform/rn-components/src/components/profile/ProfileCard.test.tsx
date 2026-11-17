/**
 * Regression tests for the ProfileCard layout guards (issue #2111).
 *
 * The RN card dropped the web card's flexbox overflow guards
 * (`min-w-0 flex-1` on the content wrapper, line clamps on the texts), so a
 * long bio pushed the Follow/Unfollow button past the right edge where it
 * was clipped. The row and text column must stay flexible and the texts
 * must keep their line caps, mirroring
 * platform/react/src/components/profile/ProfileCard.tsx.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  Pressable: (props: {
    children?: unknown;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'Pressable',
      { onPress: props.onPress, disabled: props.disabled },
      props.children
    ),
  TouchableWithoutFeedback: (props: { children?: unknown }) =>
    React.createElement('TouchableWithoutFeedback', null, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@openpeepshq/common', () => ({}));

jest.mock('@openpeepshq/common/lib', () => ({
  // Mirrored from platform/common/src/lib — the built package ships ESM
  // which Jest's node transform doesn't cover.
  markdownPlainText: (text?: string) => text ?? '',
}));

jest.mock('../icons/index', () => ({
  XIcon: () => React.createElement('XIcon'),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement('ThemedText', props, props.children),
}));

jest.mock('./Avatar', () => ({
  ProfileAvatar: (props: Record<string, unknown>) =>
    React.createElement('ProfileAvatar', props),
}));

jest.mock('./FollowUnfollowButton', () => ({
  FollowUnfollowButton: (props: Record<string, unknown>) =>
    React.createElement('FollowUnfollowButton', props),
}));

jest.mock('../../lib/utils', () => ({
  truncateText: (text: string, max: number) =>
    text && text.length > max ? `${text.slice(0, max)}…` : text,
}));

import type { ProfileCardProps } from './ProfileCard';
import { ProfileCard } from './ProfileCard';

const longBio =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(6) +
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const profile = {
  did: 'did:plc:test',
  handle: 'lovelace.example',
  displayName: 'Ada Lovelace',
  bio: longBio,
} as unknown as ProfileCardProps['profile'];

const renderCard = (props: Partial<ProfileCardProps> = {}) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ProfileCard, {
        profile,
        actionType: 'link' as const,
        ...props,
      })
    );
  });
  return tree;
};

describe('ProfileCard layout guards (issue #2111)', () => {
  it('clamps the bio to two lines so a long bio cannot push the action out', () => {
    const tree = renderCard();
    const bioText = tree.root
      .findAllByType('ThemedText')
      .find((node: { props: { children?: unknown } }) =>
        String(node.props.children).startsWith('Lorem ipsum')
      );
    expect(bioText).toBeDefined();
    expect(bioText.props.numberOfLines).toBe(2);
  });

  it('clamps the display name and handle to one line', () => {
    const tree = renderCard();
    const texts = tree.root.findAllByType('ThemedText');
    const name = texts.find(
      (node: { props: { children?: unknown } }) =>
        node.props.children === 'Ada Lovelace'
    );
    const handle = texts.find(
      (node: { props: { children?: unknown } }) =>
        String(node.props.children) === '@lovelace.example' ||
        (Array.isArray(node.props.children) &&
          node.props.children.join('') === '@lovelace.example')
    );
    expect(name).toBeDefined();
    expect(handle).toBeDefined();
    expect(name.props.numberOfLines).toBe(1);
    expect(handle.props.numberOfLines).toBe(1);
  });

  it('keeps the profile content inside a flexible row with the action pinned', () => {
    const tree = renderCard();
    const contentRow = tree.root.findByProps({
      className: 'flex flex-row items-center gap-x-2 min-w-0 flex-1',
    });
    const textColumn = tree.root.findByProps({
      className: 'min-w-0 flex-1',
    });
    expect(contentRow).toBeDefined();
    expect(textColumn).toBeDefined();
    // Follow/Unfollow action is rendered and not clipped away.
    expect(tree.root.findByType('FollowUnfollowButton')).toBeDefined();
  });

  it('drops the default spacing with unspaced (issue #1971)', () => {
    const spaced = renderCard();
    const spacedRow = spaced.root.findByProps({
      className: 'w-full flex-row items-center justify-between px-4 mb-8',
    });
    expect(spacedRow).toBeDefined();

    const unspaced = renderCard({ unspaced: true });
    const unspacedRow = unspaced.root.findByProps({
      className: 'w-full flex-row items-center justify-between',
    });
    expect(unspacedRow).toBeDefined();
  });
});
