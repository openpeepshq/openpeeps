/**
 * Live Jams card row: the participant avatar stack must not overlap the
 * attendee count label (issue #2284).
 *
 * Root cause locked in here: two `size-8` (32dp) avatars at `-mr-2` overlap
 * paint 56dp wide, but `ProfileFromId` wraps each avatar in a bare View
 * whose Yoga-measured width is `32 − 8 = 24dp`, so a content-sized box
 * (`min-w-12 w-fit`) measures only `24 + 24 = 48dp` — the 2nd avatar's
 * painted circle bleeds 8dp past the box, through the `gap-x-2`, into the
 * count label. The fix boxes the stack in a fixed `w-14` (56dp) — the exact
 * painted extent of the 2-avatar max (`slice(0, 2)`) — with `shrink-0`, so
 * the label always starts after the last painted avatar plus `gap-x-2`
 * (1-avatar jams get a 56dp slot too, which aligns count labels across
 * cards), and the count label itself is shrink-proof. These assertions pin
 * that shape: the box's single child is the real `ParticipantsCard` stack
 * root (`flex-row items-center shrink-0`) holding the participant markers,
 * the count label renders beside it with `shrink-0`, and no bare `w-12`
 * (48dp) box remains — for 1 and 2 participants.
 *
 * CardEvent is a composite, so every external import is mocked (node jest
 * env, no native modules) — mirroring FullEvent.test.tsx. The real
 * `ParticipantsCard` is exercised (via `jest.requireActual`) so the
 * stack-root assertion tests shipped markup, not a stand-in.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

// --- shared mutable state read by the module mocks (mock* = hoisting-safe) --
let mockJamState: { active: boolean; participants: string[] } | undefined;
const mockNavigate = jest.fn();

// --- react-native: host elements keep props (className) for assertions -----
jest.mock('react-native', () => {
  const React = require('react');
  const make =
    (tag: string) =>
    (props: Record<string, unknown> & { children?: ReactNode }) => {
      const { children, ...rest } = props;
      return React.createElement(tag, rest, children);
    };
  return {
    View: make('View'),
    Pressable: make('Pressable'),
    TouchableOpacity: make('TouchableOpacity'),
    Image: make('Image'),
    ActivityIndicator: make('ActivityIndicator'),
  };
});

// --- i18n: resolve keys to their defaultValue -----------------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

// --- openpeeps context + server info --------------------------------------
jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useJamState: () => ({ data: mockJamState, isLoading: false }),
    },
  }),
  useCurrentProfile: () => ({ id: 'u-1', displayName: 'Att', handle: 'att' }),
  useServerInfo: () => ({
    jams: { livekit: { enabled: true } },
  }),
}));

// --- shared (pure) helpers -------------------------------------------------
jest.mock('@openpeepshq/common/lib', () => ({
  canModerateJam: () => false,
  formatEventRecurrence: () => '',
}));

// --- navigation ------------------------------------------------------------
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
  }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));

// --- local utils -----------------------------------------------------------
jest.mock('../../../../lib/utils', () => ({
  truncateText: (s: string, n: number) => (s ? s.slice(0, n) : ''),
}));

// --- ui primitives (render inert, keep the label text) ---------------------
jest.mock('../../../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: ReactNode; className?: string }) =>
      React.createElement(
        'Text',
        { className: props.className },
        props.children
      ),
  };
});
jest.mock('../../../ui/button', () => {
  const React = require('react');
  return {
    Button: (props: {
      children?: ReactNode;
      className?: string;
      size?: string;
      onPress?: () => void;
    }) =>
      React.createElement(
        'View',
        {
          className: props.className,
          size: props.size,
          onPress: props.onPress,
        },
        props.children
      ),
  };
});

// --- sibling components (render inert) -------------------------------------
jest.mock('../../../custom/date/index', () => {
  const React = require('react');
  return {
    Timespan: () => React.createElement('View', null, 'timespan'),
  };
});
jest.mock('../../pieces/EventLocation', () => ({
  EventLocation: () => null,
}));
jest.mock('../../pieces/ShareMenu', () => ({ ShareMenu: () => null }));
jest.mock('../../../icons/index', () => ({ ShareIcon: () => null }));
jest.mock('./ProfileEventRelationship', () => ({
  ProfileEventRelationship: () => null,
}));
// The real ParticipantsCard renders `ProfileFromId` per participant; give
// each participant a marker host View so the count is assertable.
jest.mock('../../../profile/ProfileFromId', () => {
  const React = require('react');
  return {
    ProfileFromId: (props: { id: string }) =>
      React.createElement('View', { className: 'participant', id: props.id }),
  };
});

// CardEvent imports ParticipantsCard from the post barrel; serve the real
// component (so its markup is what gets asserted) and nothing else from it.
jest.mock('../../index', () => ({
  ParticipantsCard: jest.requireActual('../../pieces/ParticipantsCard')
    .ParticipantsCard,
}));

import { CardEvent } from './CardEvent';

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

function collect(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  if (typeof node === 'string') return out;
  out.push(node);
  for (const c of node.children || []) {
    if (typeof c !== 'string') collect(c, out);
  }
  return out;
}

const classList = (node: TreeNode): string[] =>
  String(node.props?.className ?? '')
    .split(/\s+/)
    .filter(Boolean);

/** Concatenated text of the rendered tree (children are split fragments). */
function textOf(node: TreeNode | (string | TreeNode)[], out = ''): string {
  if (typeof node === 'string') return out + node;
  if (Array.isArray(node)) {
    for (const c of node) out = textOf(c, out);
    return out;
  }
  return textOf(node.children || [], out);
}

/**
 * Element children only (string fragments skipped) — used to pin the stack
 * root as the box's *direct* child so a coincidental inner View carrying
 * the same tokens can never satisfy the assertion.
 */
const elementChildren = (node: TreeNode): TreeNode[] =>
  (node.children || []).filter((c): c is TreeNode => typeof c !== 'string');

const BASE_POST = {
  id: 'post-1',
  occurrenceRecurrenceId: 'occ-1',
  data: {
    type: 'event',
    name: 'Meetup',
    jam: true,
    // `image` set so the header uses a remote URI instead of require()ing a
    // local placeholder PNG (jest's node env cannot parse binary assets).
    image: 'https://openpeeps.org/img/pic.svg',
  },
};

function render(participants: string[]): TreeNode {
  mockJamState = { active: true, participants };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<CardEvent post={BASE_POST as never} />);
  });
  return tree.toJSON() as unknown as TreeNode;
}

describe('CardEvent live-jam row (issue #2284)', () => {
  it('2 participants: fixed w-14 stack box, stack root is its direct child, count label shrink-protected', () => {
    const json = render(['p-1', 'p-2']);

    // (a) the stack box: a fixed 56dp slot — the exact painted extent of two
    // 32dp avatars at -mr-2 (a content-sized box can never measure that,
    // because each ProfileFromId wrapper measures 24dp, not 32dp)
    const boxes = collect(json).filter(
      (n) => n.type === 'View' && classList(n).join(' ') === 'w-14 shrink-0'
    );
    expect(boxes).toHaveLength(1);
    const box = boxes[0];

    // (b) the box's only element child is the shipped ParticipantsCard stack
    // root, pinned as the direct child (not any descendant)
    const boxChildren = elementChildren(box);
    const stackRoots = boxChildren.filter(
      (n) =>
        n.type === 'View' &&
        classList(n).join(' ') === 'flex-row items-center shrink-0'
    );
    expect(boxChildren).toHaveLength(1);
    expect(stackRoots).toHaveLength(1);

    // (c) both participant markers sit directly under the stack root
    const participants = elementChildren(stackRoots[0]).map((n) => n.props?.id);
    expect(participants).toEqual(['p-1', 'p-2']);

    // (d) the overlap-prone 48dp box is gone: no host View whose class list
    // is exactly the old fixed box (`w-12` alone). `includes('w-12')` would
    // also trip on a `min-w-12`-carrying ancestor, so pin the exact pre-fix
    // shape.
    const bareBoxes = collect(json).filter(
      (n) => n.type === 'View' && classList(n).join(' ') === 'w-12'
    );
    expect(bareBoxes).toHaveLength(0);

    // (e) the count label renders beside the stack and is shrink-protected,
    // so a tight row squeezes the button, never the label into the avatars
    const labels = collect(json).filter(
      (n) => n.type === 'Text' && classList(n).join(' ') === 'shrink-0'
    );
    expect(labels).toHaveLength(1);
    expect(textOf(labels[0])).toBe('2 attendees');
  });

  it('1 participant: same single w-14 box and shrink-protected singular label', () => {
    const json = render(['p-1']);

    const boxes = collect(json).filter(
      (n) => n.type === 'View' && classList(n).join(' ') === 'w-14 shrink-0'
    );
    expect(boxes).toHaveLength(1);
    const stackRoots = elementChildren(boxes[0]).filter(
      (n) =>
        n.type === 'View' &&
        classList(n).join(' ') === 'flex-row items-center shrink-0'
    );
    expect(stackRoots).toHaveLength(1);
    const participants = elementChildren(stackRoots[0]).map((n) => n.props?.id);
    expect(participants).toEqual(['p-1']);

    const bareBoxes = collect(json).filter(
      (n) => n.type === 'View' && classList(n).join(' ') === 'w-12'
    );
    expect(bareBoxes).toHaveLength(0);

    const labels = collect(json).filter(
      (n) => n.type === 'Text' && classList(n).join(' ') === 'shrink-0'
    );
    expect(labels).toHaveLength(1);
    expect(textOf(labels[0])).toBe('1 attendee');
  });
});
