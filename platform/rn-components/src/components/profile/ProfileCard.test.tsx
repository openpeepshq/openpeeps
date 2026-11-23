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
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
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
  TouchableWithoutFeedback: (props: {
    children?: unknown;
    accessible?: boolean;
    onPress?: () => void;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { selected?: boolean };
  }) =>
    React.createElement(
      'TouchableWithoutFeedback',
      {
        accessible: props.accessible,
        onPress: props.onPress,
        accessibilityRole: props.accessibilityRole,
        accessibilityLabel: props.accessibilityLabel,
        accessibilityState: props.accessibilityState,
      },
      props.children
    ),
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
import { MiniProfileCard, ProfileCard } from './ProfileCard';

const longBio =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(6) +
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const profile = {
  did: 'did:plc:test',
  handle: 'lovelace.example',
  displayName: 'Ada Lovelace',
  bio: longBio,
} as unknown as ProfileCardProps['profile'];

const renderCard = (
  props: Partial<ProfileCardProps> = { actionType: 'link' as const }
) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ProfileCard, {
        profile,
        ...props,
      } as ProfileCardProps)
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

describe('ProfileCard select-mode row (issue #1666)', () => {
  it('renders a single-line text-base row without the bio in select mode', () => {
    const tree = renderCard({ actionType: 'select' });
    const name = tree.root
      .findAllByType('ThemedText')
      .find(
        (node: { props: { children?: unknown } }) =>
          node.props.children === 'Ada Lovelace'
      );
    expect(name).toBeDefined();
    expect(name.props.className).toBe('text-base font-semibold truncate');
    expect(name.props.numberOfLines).toBe(1);
    // Bio has no business in a picker row — it shifts the avatar center.
    const bioText = tree.root
      .findAllByType('ThemedText')
      .find((node: { props: { children?: unknown } }) =>
        String(node.props.children).startsWith('Lorem ipsum')
      );
    expect(bioText).toBeUndefined();
  });

  it('renders the handle as a muted, smaller secondary line in select mode', () => {
    // Round-2 plan option B: name `text-base` + handle
    // `text-muted-foreground text-sm` — two equal-weight 16dp lines leave the
    // avatar sitting on the seam between them (issue #1666 QA rejections).
    const handleText = (node: { props: { children?: unknown } }): string =>
      Array.isArray(node.props.children)
        ? node.props.children.join('')
        : String(node.props.children);
    const tree = renderCard({ actionType: 'select' });
    const handle = tree.root
      .findAllByType('ThemedText')
      .find((node: { props: { children?: unknown } }) =>
        handleText(node).startsWith('@lovelace.example')
      );
    expect(handle).toBeDefined();
    expect(handle.props.className).toBe(
      'text-muted-foreground text-sm truncate'
    );
    expect(handle.props.numberOfLines).toBe(1);

    // Non-select cards keep the default handle styling.
    const bigTree = renderCard();
    const bigHandle = bigTree.root
      .findAllByType('ThemedText')
      .find((node: { props: { children?: unknown } }) =>
        handleText(node).startsWith('@lovelace.example')
      );
    expect(bigHandle).toBeDefined();
    expect(bigHandle.props.className).toBe('truncate');
  });

  it('keeps the 40dp avatar and the compact row padding in select mode', () => {
    const tree = renderCard({ actionType: 'select' });
    expect(
      tree.root.findByProps({
        className:
          'w-full flex-row items-center justify-between px-4 mb-1 py-1.5',
      })
    ).toBeDefined();
    const avatar = tree.root.findByType('ProfileAvatar');
    expect(avatar.props.className).toBe('size-10');
  });

  it('defers the inner touchable a11y when the caller provides no a11y props (issue #1666 review S2)', () => {
    // A wrapped caller (ProfileSelector) carries the a11y on its own
    // `Pressable` and passes nothing to the card; the inner touchable must
    // defer (accessible=false) so screen readers see one element per row.
    const selectTree = renderCard({ actionType: 'select' });
    expect(
      selectTree.root.findByType('TouchableWithoutFeedback').props.accessible
    ).toBe(false);
    // Non-select cards keep the default (accessible) touchable.
    const linkTree = renderCard({ actionType: 'link' });
    expect(
      linkTree.root.findByType('TouchableWithoutFeedback').props.accessible
    ).toBeUndefined();
  });

  it('carries the a11y on the row itself when the caller passes a11y props (issue #1666 round-10 S1)', () => {
    // A bare caller (the DM candidate list) wraps the row in no accessible
    // element, so it passes the a11y straight to the card; the inner
    // touchable must then BE the accessible element, or the whole picker
    // would be invisible to screen readers.
    const tree = renderCard({
      actionType: 'select',
      accessibilityRole: 'button',
      accessibilityLabel: 'Ada (selected)',
      accessibilityState: { selected: true },
    });
    const touchable = tree.root.findByType('TouchableWithoutFeedback');
    expect(touchable.props.accessible).toBe(true);
    expect(touchable.props.accessibilityRole).toBe('button');
    expect(touchable.props.accessibilityLabel).toBe('Ada (selected)');
    expect(touchable.props.accessibilityState).toEqual({ selected: true });
  });

  it('keeps the large card geometry (bio included) outside select mode', () => {
    const tree = renderCard({ actionType: 'link' });
    const name = tree.root
      .findAllByType('ThemedText')
      .find(
        (node: { props: { children?: unknown } }) =>
          node.props.children === 'Ada Lovelace'
      );
    expect(name.props.className).toBe('text-lg font-semibold truncate');
    const bioText = tree.root
      .findAllByType('ThemedText')
      .find((node: { props: { children?: unknown } }) =>
        String(node.props.children).startsWith('Lorem ipsum')
      );
    expect(bioText).toBeDefined();
    // The non-select geometry contract (issue #1666 review S6): the large
    // card keeps its `size-16` avatar and `mb-8` row padding — symmetric to
    // the select-mode pinning above.
    expect(tree.root.findByType('ProfileAvatar').props.className).toBe(
      'size-16'
    );
    expect(
      tree.root.findByProps({
        className: 'w-full flex-row items-center justify-between px-4 mb-8',
      })
    ).toBeDefined();
  });
});

describe('MiniProfileCard compact chip (issue #1666 round-11 S2)', () => {
  const renderChip = (props: Partial<{ showAction: boolean }> = {}) => {
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(MiniProfileCard, { profile, ...props })
      );
    });
    return tree;
  };

  it('keeps the size-3 avatar, text-xs label and py-1.5 padding (web ProfileBadge parity)', () => {
    // The round-8/S4 change shrank the chip to match the web `ProfileBadge`
    // (12dp avatar, 12sp label, tight padding). Pin that geometry so it does
    // not silently regress to the old larger chip (`size-8` avatar, default
    // text size, `py-2`).
    const tree = renderChip();
    expect(tree.root.findByType('ProfileAvatar').props.className).toBe(
      'size-3'
    );
    const label = tree.root
      .findAllByType('ThemedText')
      .find((node: { props: { children?: unknown } }) =>
        String(node.props.children).startsWith('Ada')
      );
    expect(label).toBeDefined();
    expect(label.props.className).toBe('text-xs');
    expect(
      tree.root.findByProps({
        className:
          'flex flex-row items-center gap-x-2 rounded-md border border-border px-2 py-1.5',
      })
    ).toBeDefined();
  });

  it('omits the remove button when showAction is false', () => {
    const withAction = renderChip();
    expect(withAction.root.findByType('Pressable')).toBeDefined();

    const noAction = renderChip({ showAction: false });
    expect(noAction.root.findAllByType('Pressable')).toHaveLength(0);
  });
});
