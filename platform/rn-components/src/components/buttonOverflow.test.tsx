/**
 * Regression tests for #1813 — "buttons do not fit on screen, they go off to
 * the right" (iPhone 11, 414pt). Three horizontal rows used an unbounded
 * `justify-between` layout whose children could not shrink, so when their
 * intrinsic width exceeded the row the rightmost control was pushed past the
 * screen edge:
 *
 * - the feed event card's "View Event" button (post/types/Event.tsx),
 * - the group card's "View" / join button (groups/GroupCard.tsx),
 * - the mobile jam footer's "Leave" button (jams/JamFooter.tsx).
 *
 * The fix gives each row a shrinkable, truncating left side (`min-w-0 flex-1`
 * + `numberOfLines={1}`) and an unsquishable right side (`shrink-0`), mirroring
 * the web `GroupCard` and the `JamDesktopFooter` patterns already in this
 * package. The shrinkable-left role applies to the variable-width text nodes
 * themselves (the event date range, the group name), not just their row
 * wrappers — in Yoga a text with `numberOfLines={1}` alone keeps its intrinsic
 * width and can still push a `shrink-0` sibling off the right edge. These
 * render tests pin those flex roles so the overflow class cannot return.
 *
 * All external modules are mocked (node jest env, no native modules); the host
 * elements forward `className`/`numberOfLines` so the layout classes under
 * test are readable on the rendered tree.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const React = require('react');

const { mapColors } = require('../theme/defaults');

const el =
  (tag: string, props?: Record<string, unknown>) =>
  ({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) =>
    React.createElement(tag, props ? { ...props, ...rest } : rest, children);

jest.mock('react-native', () => ({
  View: el('View'),
  Text: el('Text'),
  Pressable: el('Pressable'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));

jest.mock('@openpeepshq/common', () => ({
  formatBadgeCount: (n: number) => String(n),
  isDeletedProfile: () => false,
}));
jest.mock('@openpeepshq/common/lib', () => ({
  formatEventRecurrence: () => '',
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({ queryClient: { invalidateQueries: jest.fn() } }),
  useJamFooterControls: () => ({
    isModerator: false,
    isRecording: false,
    recordingLabel: 'Record',
    recordingEnabled: false,
    busy: false,
    sendReactionEmoji: jest.fn(),
    toggleRecording: jest.fn(),
    raiseHand: jest.fn(),
  }),
  // LeaveCloseButton context hooks (the real component is rendered in its own
  // case below; JamFooter keeps its LeaveCloseButton element mock).
  useJamContext: () => ({
    jam: { moderators: [] },
    jamPost: { id: 'jam-1' },
    occurrence: undefined,
    markIntentionalLeave: jest.fn(),
  }),
  useLeaveCloseJam: () => ({
    busy: false,
    confirmOpen: false,
    setConfirmOpen: jest.fn(),
    handleClick: jest.fn(),
    handleLeave: jest.fn(),
    handleClose: jest.fn(),
  }),
  // FollowUnfollowButton + profile/Avatar helpers (both render for real
  // inside ProfileWithActionCard)
  useFollowProfile: () => ({
    isSelf: false,
    isFollowing: false,
    follow: jest.fn(),
    unfollow: jest.fn(),
  }),
  hueFromHandle: () => 210,
  initialsBackground: () => '#ddd',
  svgCoverSrc: () => undefined,
  getInitials: () => '',
}));

// Real theme defaults (nativewind-free), so useThemeOpacity color math runs
// as real code (same approach as JamRoomIndicators.test.tsx).
jest.mock('../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({
    isDark: false,
    colors: mapColors(false),
    buttonRadius: '9999px',
    refresh: () => {},
  }),
}));

// `lib/utils` imports react-native-config (native module, ESM-only) — mock it
// wholesale with the helpers the components under test actually use.
jest.mock('../lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  formatEventDate: (_d?: unknown) => 'Jan 5',
}));

jest.mock('./ui/avatar', () => ({
  Avatar: (props: Record<string, unknown>) =>
    React.createElement('Avatar', props, props.children as never),
  AvatarImage: () => null,
  AvatarFallback: () => null,
}));
jest.mock('./ui/themed-text', () => ({
  ThemedText: el('ThemedText', { forwarded: true }),
  TextClassContext: {
    Provider: ({ children }: { children?: ReactNode }) => children,
  },
}));
jest.mock('./ui/button', () => ({
  Button: el('Button', { forwarded: true }),
}));
// Default import (`import Toast from …`) in JamFooter /
// FollowUnfollowButton / JoinGroupButton — expose the `default` shape.
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('./icons/index', () => ({
  UsersIcon: () => null,
  UserXIcon: () => null,
  CircleEllipsisIcon: () => null,
  CircleStopIcon: () => null,
  DiscIcon: () => null,
  HandIcon: () => null,
  InfoIcon: () => null,
  LaughIcon: () => null,
  MessageSquareTextIcon: () => null,
  UsersRoundIcon: () => null,
}));

// The feed event card pulls the `custom/common` barrel (CachedImage,
// ParticipantAvatar), which transitively imports native modules unavailable in
// the node jest env — render them inert.
jest.mock('./custom/common/index', () => {
  const React = require('react');
  return {
    CachedImage: (props: { children?: ReactNode }) =>
      React.createElement('CachedImage', null, props.children),
  };
});
jest.mock('./custom/common/participant-avatar', () => ({
  ParticipantAvatar: () => null,
}));

jest.mock('./groups/JoinGroupButton', () => ({
  JoinGroupButton: el('JoinGroupButton'),
}));
jest.mock('./jams/JamDeviceSelectors', () => ({
  JamMicSelector: () => null,
  JamCameraSelector: () => null,
  JamAudioOutputSelector: () => null,
}));
jest.mock('./jams/JamReactionMenu', () => ({
  JamReactionMenu: () => null,
}));
jest.mock('./jams/JamToolbarButton', () => ({
  JamToolbarButton: el('JamToolbarButton'),
  toneIconClass: {},
}));
const realLeaveCloseButton = jest.requireActual(
  './jams/LeaveCloseButton'
) as typeof import('./jams/LeaveCloseButton');
jest.mock('./jams/LeaveCloseButton', () => ({
  ...realLeaveCloseButton,
  // JamFooter renders the element mock; the dedicated case below renders
  // LeaveCloseButton directly for the real component's guards.
  LeaveCloseButton: el('LeaveCloseButton', { forwarded: true }),
}));

// LiveKit / the footer controls hook are irrelevant to the layout.
jest.mock('@livekit/react-native', () => ({
  useParticipants: () => [],
  useRoomContext: () => ({ disconnect: jest.fn() }),
}));

import { FeedEvent } from './post/types/Event';
import { GroupCard } from './groups/GroupCard';
import { JamFooter } from './jams/JamFooter';
import { ProfileWithActionCard } from './profile/ProfileWithActionCard';

// The real LeaveCloseButton, kept aside from its JamFooter element mock.
const { LeaveCloseButton: RealLeaveCloseButton } = realLeaveCloseButton;

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

const walk = (node: TreeNode): TreeNode[] => [
  node,
  ...(node.children ?? [])
    .filter((child): child is TreeNode => typeof child !== 'string')
    .flatMap((child) => walk(child)),
];

const find = (
  node: TreeNode,
  type: string,
  prop: string
): TreeNode | undefined =>
  walk(node).find((n) => n.type === type && n.props && prop in n.props);

/** First element of `type` whose `className` contains every given token. */
const findWithClass = (
  node: TreeNode,
  type: string,
  ...tokens: string[]
): TreeNode | undefined =>
  walk(node).find((n) => {
    if (n.type !== type || typeof n.props?.className !== 'string') return false;
    return tokens.every((t) => String(n.props!.className).includes(t));
  });

const containsText = (node: TreeNode, text: string): boolean =>
  walk(node).some((n) => {
    if (typeof n.children === 'undefined') return false;
    const joined = (n.children ?? [])
      .map((c) => (typeof c === 'string' ? c : containsText(c, text)))
      .filter(Boolean)
      .join(' ');
    return joined.includes(text);
  });

const render = (ui: ReactNode): TreeNode => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(ui);
  });
  expect(tree.toJSON()).not.toBeNull();
  return tree.toJSON() as unknown as TreeNode;
};

describe('feed event card (post/types/Event.tsx)', () => {
  const feedPost = {
    id: 'post-1',
    profile: { id: 'owner', displayName: 'Owner' },
    visibility: 'public',
    occurrenceStart: 'start',
    occurrenceEnd: 'end',
    data: { type: 'event', name: 'Meetup', timeZone: 'America/Chicago' },
  };

  test('long date range: date text truncates and the View Event button stays on-screen', () => {
    const root = render(<FeedEvent post={feedPost as never} />);
    expect(containsText(root, 'View Event')).toBe(true);

    // The left date text is the shrinkable, truncating side of the row.
    const dateText = find(root, 'ThemedText', 'numberOfLines');
    expect(dateText).toBeDefined();
    expect(dateText!.props?.numberOfLines).toBe(1);
    expect(String(dateText!.props?.className)).toContain(
      'text-muted-foreground'
    );
    // `numberOfLines` alone does not yield width in Yoga — the text must also
    // be shrinkable, or a long date range pushes the button off-screen again.
    expect(String(dateText!.props?.className)).toContain('min-w-0');
    expect(String(dateText!.props?.className)).toContain('flex-1');

    // The "View Event" button is the unsquishable right-hand control: it keeps
    // its own width instead of being pushed off the right edge.
    const button = find(root, 'Button', 'onPress');
    expect(button).toBeDefined();
    expect(String(button!.props?.className)).toContain('shrink-0');
  });

  test('event without an end time still keeps the guard on the button', () => {
    const root = render(
      <FeedEvent post={{ ...feedPost, occurrenceEnd: undefined } as never} />
    );
    const button = find(root, 'Button', 'onPress');
    expect(button).toBeDefined();
    expect(String(button!.props?.className)).toContain('shrink-0');
  });
});

describe('group card (groups/GroupCard.tsx)', () => {
  const group = {
    id: 'g-1',
    name: 'A very long group name that will never fit on one narrow row',
    displayName: 'A very long group name that will never fit on one narrow row',
    membersCount: 42,
    avatar: undefined,
  };

  test('long group name: name truncates and the action stays on-screen', () => {
    const root = render(
      <GroupCard
        group={group as never}
        isGroupMember
        handleViewGroup={() => {}}
      />
    );

    // The group name is the shrinkable, truncating side of the inner name row
    // (next to the fixed-width unread badge): it yields width and ellipsizes
    // instead of pushing the badge or the action column off the card.
    const name = findWithClass(
      root,
      'ThemedText',
      'min-w-0',
      'flex-1',
      'font-semibold'
    );
    expect(name).toBeDefined();
    expect(name!.props?.numberOfLines).toBe(1);
    // The component renders the display name itself (no truncateText
    // pre-truncation), so the full string must be present on the tree.
    expect(
      containsText(root, 'A very long group name that will never fit')
    ).toBe(true);

    // The action column (View / join) is unsquishable, so it never gets pushed
    // off the right edge.
    const action = findWithClass(root, 'View', 'shrink-0', 'ml-2');
    expect(action).toBeDefined();
  });

  test('non-member: the action column keeps the shrink guard', () => {
    const root = render(
      <GroupCard
        group={group as never}
        isGroupMember={false}
        handleViewGroup={() => {}}
      />
    );
    // The join control renders, and its action column is still unsquishable.
    const join = [...walk(root)].find((n) => n.type === 'JoinGroupButton');
    expect(join).toBeDefined();
    const action = findWithClass(root, 'View', 'shrink-0', 'ml-2');
    expect(action).toBeDefined();
  });
});

describe('mobile jam footer (jams/JamFooter.tsx)', () => {
  const props = {
    chatOpen: false,
    onToggleChat: () => {},
    peopleOpen: false,
    onTogglePeople: () => {},
    detailsOpen: false,
    onToggleDetails: () => {},
    speakerEnabled: true,
    onSpeakerChange: () => {},
    onToggleSpeaker: () => {},
  };

  test('device group can yield width; the Leave cluster is fixed', () => {
    const root = render(<JamFooter {...(props as never)} />);

    const views = [...walk(root)]
      .filter(
        (n) => n.type === 'View' && typeof n.props?.className === 'string'
      )
      .map((n) => String(n.props?.className));
    expect(views.length).toBeGreaterThanOrEqual(2);

    // The left device-selector group is the shrinkable side of the footer row
    // and clips (never overflows onto) the fixed right cluster.
    const left = views.find(
      (c) => c.includes('min-w-0') && c.includes('flex-1')
    );
    expect(left).toBeDefined();
    expect(left).toContain('overflow-hidden');

    // The reactions / overflow / Leave cluster is the unsquishable side, so
    // "Leave" can never be pushed past the screen edge.
    const right = views.find((c) => c.includes('shrink-0'));
    expect(right).toBeDefined();

    // The Leave control is present in the fixed cluster.
    const leave = [...walk(root)].find((n) => n.type === 'LeaveCloseButton');
    expect(leave).toBeDefined();
  });
});

// The real Leave button (round-3 suggestion 4): the JamFooter case mocks this
// component, so its own guards are pinned here — its context hooks are mocked
// alongside the other @openpeepshq/react hooks at the top of the file, so it
// renders without native modules and its Button / text props stay readable.
describe('real leave/close button (jams/LeaveCloseButton.tsx)', () => {
  test('the Leave label is unsquishable and never wraps', () => {
    const root = render(<RealLeaveCloseButton />);

    const button = find(root, 'Button', 'onPress');
    expect(button).toBeDefined();
    expect(String(button!.props?.className)).toContain('shrink-0');
    const label = find(root, 'ThemedText', 'numberOfLines');
    expect(label).toBeDefined();
    expect(label!.props?.numberOfLines).toBe(1);
    expect(containsText(root, 'jams.exit.confirm')).toBe(true);
  });
});

// Same overflow class in the profile rows with a trailing follow/unfollow
// button (round-3 suggestion 1): the card renders at full sheet width in
// RepostModal/ReactionsModal, so a long name/handle must shrink and truncate
// instead of pushing the button past the right edge.
describe('profile with action card (profile/ProfileWithActionCard.tsx)', () => {
  const profile = {
    did: 'did:plc:test',
    handle: 'grace.hopper@example',
    displayName:
      'A very long display name that will never fit on one narrow row',
  } as never;

  test('long name: texts truncate and the follow button stays on-screen', () => {
    const root = render(<ProfileWithActionCard profile={profile} />);

    // The name/handle texts are the shrinkable, truncating side of the row.
    const name = findWithClass(root, 'ThemedText', 'font-bold');
    expect(name).toBeDefined();
    expect(name!.props?.numberOfLines).toBe(1);
    const texts = [...walk(root)].filter((n) => n.type === 'ThemedText');
    expect(
      texts.some((n) => String(n.props?.numberOfLines ?? '') === '1')
    ).toBe(true);

    // The text column yields width; the follow button never leaves the edge.
    const column = findWithClass(root, 'View', 'min-w-0', 'flex-1');
    expect(column).toBeDefined();
    const action = findWithClass(root, 'View', 'shrink-0');
    expect(action).toBeDefined();
    // FollowUnfollowButton renders for real (its hooks are mocked at the top
    // of the file); its unsquishable wrapper column is the pinned contract.
    const actionButton = findWithClass(action!, 'Button');
    expect(actionButton).toBeDefined();
  });
});
