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

const el =
  (tag: string, props?: Record<string, unknown>) =>
  ({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) =>
    React.createElement(tag, props ? { ...props, ...rest } : rest, children);

jest.mock('react-native', () => ({
  View: el('View'),
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
}));

// `lib/utils` also exports date helpers used by the feed event card.
jest.mock('../lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  formatEventDate: (_d?: unknown) => 'Jan 5',
}));

jest.mock('./ui/avatar', () => ({
  Avatar: el('Avatar'),
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
jest.mock('./icons/index', () => ({
  UsersIcon: () => null,
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
jest.mock('./jams/LeaveCloseButton', () => ({
  LeaveCloseButton: el('LeaveCloseButton', { forwarded: true }),
}));

// LiveKit / toasts / the footer controls hook are irrelevant to the layout.
jest.mock('@livekit/react-native', () => ({
  useParticipants: () => [],
  useRoomContext: () => ({ disconnect: jest.fn() }),
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

import { FeedEvent } from './post/types/Event';
import { GroupCard } from './groups/GroupCard';
import { JamFooter } from './jams/JamFooter';

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

function* walk(node: TreeNode): Generator<TreeNode> {
  yield node;
  for (const child of node.children ?? []) {
    if (typeof child !== 'string') yield* walk(child);
  }
}

function find(
  node: TreeNode,
  type: string,
  prop: string
): TreeNode | undefined {
  for (const n of walk(node)) {
    if (n.type === type && n.props && prop in n.props) return n;
  }
  return undefined;
}

/** First element of `type` whose `className` contains every given token. */
function findWithClass(
  node: TreeNode,
  type: string,
  ...tokens: string[]
): TreeNode | undefined {
  for (const n of walk(node)) {
    if (n.type !== type || typeof n.props?.className !== 'string') continue;
    if (tokens.every((t) => String(n.props!.className).includes(t))) return n;
  }
  return undefined;
}

function containsText(node: TreeNode, text: string): boolean {
  for (const n of walk(node)) {
    if (typeof n.children !== 'undefined') {
      const joined = (n.children ?? [])
        .map((c) => (typeof c === 'string' ? c : containsText(c, text)))
        .filter(Boolean)
        .join(' ');
      if (joined.includes(text)) return true;
    }
  }
  return false;
}

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
