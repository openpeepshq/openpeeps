/**
 * Join-Jam affordance for signed-in attendees on the single event page
 * (issue #1815). The RN `FullEvent` previously rendered a Join/Start button
 * only for the host or a jam moderator, so an attendee on a *live* jam had no
 * way to join from this screen. This locks in the attendee button: it appears
 * only when the user is signed in, LiveKit is enabled, and the jam is active;
 * it is mutually exclusive with the host/moderator button; and pressing it
 * navigates to the JamSession (the same route CardEvent uses), leaving all
 * auth/capacity/moderation gating to JamSession -> JamRoom.
 *
 * FullEvent is a large composite, so every external import is mocked (node
 * jest env, no native modules) — mirroring MessageInThread.test.tsx. Only the
 * jam-section decision tree under test is exercised; the surrounding feed /
 * tabs / share UI render inert mocks.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

// --- shared mutable state read by the module mocks (mock* = hoisting-safe) --
let mockJamState: { active: boolean } | undefined;
let mockProfile: { id: string; displayName?: string; handle?: string } | null =
  { id: 'u-1', displayName: 'Att', handle: 'att' };
const mockNavigate = jest.fn();
const mockClient = { posts: { exportRsvps: jest.fn() } };
const mockUseServerInfo = jest.fn(() => ({
  jams: { livekit: { enabled: true } },
}));

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, null, props.children);
  return {
    View: make('View'),
    Pressable: make('Pressable'),
    TouchableOpacity: make('TouchableOpacity'),
    Image: make('Image'),
    Share: { share: jest.fn() },
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
    currentProfile: mockProfile,
    openpeepsApi: {
      rsvpManageAction: () => ({}),
      useJamAttendance: () => ({ isSuccess: false, data: [] }),
      useJamState: () => ({ data: mockJamState }),
      usePostRecordings: () => ({ data: [] }),
      usePostContext: () => ({ data: undefined }),
    },
    client: mockClient,
  }),
  useServerInfo: mockUseServerInfo,
}));

// --- shared (pure) helpers -------------------------------------------------
jest.mock('@openpeepshq/common', () => ({
  buildThreads: (posts: unknown[]) => (Array.isArray(posts) ? posts : []),
}));
jest.mock('@openpeepshq/common/lib', () => ({
  availableSpots: () => null,
  canAccessJamRecordings: () => false,
  canModerateJam: () => false,
  canViewJamAttendees: () => false,
  effectiveEventTimes: () => ({}),
  eventTimeZoneOptions: () => ({ label: 'UTC' }),
  formatEventClockTime: () => '',
  formatEventRecurrence: () => '',
  listRsvpOccurrences: () => [],
  parseOccurrenceQuery: () => null,
  rsvpExportFilename: () => 'rsvp.csv',
}));

// --- navigation ------------------------------------------------------------
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
  }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));

// --- native third-party modules (no native impl in node) ------------------
jest.mock('react-native-fs', () => ({ default: { CachesDirectoryPath: '' } }));
jest.mock('@react-native-clipboard/clipboard', () => ({
  default: { setString: jest.fn(), getString: jest.fn() },
}));
jest.mock('react-native-toast-message', () => ({
  default: { show: jest.fn() },
}));
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: () => null,
}));

// --- local modules (state stores, sheets, utils, constants) ---------------
jest.mock('../../../../stores/useNewConversationStore', () => ({
  useNewConversationStore: () => ({ setContt: jest.fn() }),
}));
jest.mock('../../../../hooks/use-controlled-sheet', () => ({
  useControlledSheet: () => ({ current: {} }),
}));
jest.mock('../../../../lib/utils', () => ({
  profileName: (p?: { displayName?: string; handle?: string }) =>
    p?.displayName ?? p?.handle ?? '',
  groupName: (g?: { name?: string }) => g?.name ?? '',
  truncateText: (s: string, n: number) => (s ? s.slice(0, n) : ''),
  canManageEventRsvps: () => false,
}));
jest.mock('../../../../lib/constants', () => ({
  BASE_URL: 'https://openpeeps.org',
}));
jest.mock('../../../../lib/downloadFile', () => ({
  downloadDocument: jest.fn(),
}));

// --- ui primitives ---------------------------------------------------------
// Each factory is self-contained (React.createElement) because jest.mock
// factories run during hoisted import resolution, before top-level consts.
jest.mock('../../../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: ReactNode }) =>
      React.createElement('Text', null, props.children),
  };
});
jest.mock('../../../ui/themed-view', () => {
  const React = require('react');
  return {
    ThemedView: (props: { children?: ReactNode }) =>
      React.createElement('View', null, props.children),
  };
});
jest.mock('../../../ui/button', () => {
  const React = require('react');
  // forwards props (incl. onPress/className) to a host View so the button is
  // findable, pressable, and carries the styling under test.
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
jest.mock('../../../ui/dropdown-menu', () => {
  const React = require('react');
  const V = (p: { children?: ReactNode }) =>
    React.createElement('View', null, p.children);
  return {
    DropdownMenu: V,
    DropdownMenuContent: V,
    DropdownMenuGroup: V,
    DropdownMenuTrigger: V,
    DropdownMenuItem: () => null,
  };
});
jest.mock('../../../ui/tabs', () => {
  const React = require('react');
  const V = (p: { children?: ReactNode }) =>
    React.createElement('View', null, p.children);
  return { Tabs: V, TabsList: V, TabsTrigger: V, TabsContent: V };
});

// --- sibling components (render inert) ------------------------------------
jest.mock('../../../profile/Avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('../../../profile/ProfileFromId', () => ({
  ProfileFromId: () => null,
}));
jest.mock('../../../profile/index', () => ({
  ReportProfileOrPostModal: () => null,
}));
jest.mock('../../../custom/date/updating-date', () => ({
  UpdatingDate: () => null,
}));
jest.mock('../../../custom/modals/common', () => ({
  BaseSheet: () => null,
  SheetFooter: () => null,
}));
jest.mock('../../pieces/VideoPlayer', () => ({ VideoPlayer: () => null }));
jest.mock('../../pieces/EventOccurrenceList', () => ({
  EventOccurrenceList: () => null,
}));
jest.mock('../../pieces/EventRsvpList', () => ({
  EventRsvpList: () => null,
}));
jest.mock('../../../markdown/index', () => ({
  OpenpeepsMarkdown: () => null,
}));
jest.mock('../../../icons/index', () => ({
  MoreVerticalIcon: () => null,
  ShareIcon: () => null,
  DownloadIcon: () => null,
  Trash2Icon: () => null,
  MapPinIcon: () => null,
  LinkIcon: () => null,
  PhoneCallIcon: () => null,
  Link2Icon: () => null,
  SendIcon: () => null,
  PencilIcon: () => null,
  FlagIcon: () => null,
}));
// The components barrel (EventRsvpButton, ReplyBox, ShareMenu, useNewPostModal, ...)
jest.mock('../../index', () => ({
  EventMenu: () => null,
  EventRsvpButton: () => null,
  ReplyBox: () => null,
  ShareMenu: () => null,
  ThreadedFeed: () => null,
  useNewPostModal: () => ({ openNewPost: jest.fn() }),
}));

import { FullEvent } from './FullEvent';

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

// A "Join Jam" button is the host View that carries the label AND forwards
// onPress (only Button does). Search deepest-first so the button itself — not
// an ancestor container that merely contains the label — is returned.
function joinButton(node: TreeNode): TreeNode | undefined {
  if (node.type !== 'View') return undefined;
  const kids = (node.children || []).filter(
    (c): c is TreeNode => typeof c !== 'string'
  );
  for (const c of kids) {
    const found = joinButton(c);
    if (found) return found;
  }
  if (typeof node.props?.onPress !== 'function') return undefined;
  return JSON.stringify(node.children || []).includes('Join Jam')
    ? node
    : undefined;
}

const BASE_POST = {
  id: 'post-1',
  profile: { id: 'owner-1', displayName: 'Owner' },
  visibility: 'public',
  // `image` set so the header uses a remote URI instead of require()ing a
  // local placeholder PNG (jest's node env cannot parse binary assets).
  data: {
    type: 'event',
    name: 'Meetup',
    jam: true,
    image: 'https://openpeeps.org/img/pic.svg',
  },
};

function render(
  post: unknown,
  occurrence?: string
): ReactTestRenderer.ReactTestRenderer {
  mockNavigate.mockClear();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <FullEvent post={post as never} occurrence={occurrence} />
    );
  });
  return tree;
}

beforeEach(() => {
  mockJamState = undefined;
  mockProfile = { id: 'u-1', displayName: 'Att', handle: 'att' };
  mockUseServerInfo.mockReset();
  mockUseServerInfo.mockReturnValue({ jams: { livekit: { enabled: true } } });
});

test('1. signed-in attendee, live jam, livekit on -> Join Jam button navigates to JamSession', () => {
  mockJamState = { active: true };
  const tree = render(BASE_POST, 'occ-1');
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Join Jam');
  expect(json).not.toContain('Start jam'); // attendee never sees the host block
  const button = joinButton(tree.toJSON() as unknown as TreeNode);
  expect(button).toBeDefined();
  // Pressing it navigates to the jam session with the occurrence (CardEvent parity).
  ReactTestRenderer.act(() => {
    (button!.props?.onPress as () => void)();
  });
  expect(mockNavigate).toHaveBeenCalledWith('JamSession', {
    jamId: 'post-1',
    occurrence: 'occ-1',
  });
  // Button styling matches the host button on this screen (review suggestion #2):
  // full width, default size — not the inline `size="sm"` of CardEvent.
  expect(button!.props?.className).toBe('mt-2 w-full');
  expect(button!.props?.size).toBeUndefined();
  tree.unmount();
});

test('2. signed out (no profile) -> no Join Jam button', () => {
  mockJamState = { active: true };
  mockProfile = null;
  const tree = render(BASE_POST);
  const json = JSON.stringify(tree.toJSON());
  expect(json).not.toContain('Join Jam');
  tree.unmount();
});

test('3. jam not started (jamState inactive) -> no Join Jam button for attendee', () => {
  mockJamState = { active: false };
  const tree = render(BASE_POST);
  const json = JSON.stringify(tree.toJSON());
  expect(json).not.toContain('Join Jam');
  expect(json).not.toContain('Start jam'); // attendee, not host
  tree.unmount();
});

test('4. jam ended -> no Join Jam button (ended jam reports inactive state)', () => {
  mockJamState = { active: false };
  const tree = render(BASE_POST);
  const json = JSON.stringify(tree.toJSON());
  expect(json).not.toContain('Join Jam');
  tree.unmount();
});

test('5. livekit disabled on server -> no Join Jam button', () => {
  mockJamState = { active: true };
  mockUseServerInfo.mockReturnValue({ jams: { livekit: { enabled: false } } });
  const tree = render(BASE_POST);
  const json = JSON.stringify(tree.toJSON());
  expect(json).not.toContain('Join Jam');
  tree.unmount();
});

test('6. host, live jam -> host Join Jam shown (single; attendee block gated off)', () => {
  mockJamState = { active: true };
  // Host: currentProfile.id === post.profile.id
  const hostPost = { ...BASE_POST, profile: { id: 'u-1', displayName: 'Me' } };
  const tree = render(hostPost);
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Join Jam');
  const button = joinButton(tree.toJSON() as unknown as TreeNode);
  expect(button).toBeDefined();
  // Only the host button renders; the attendee block is mutually exclusive.
  expect(json.match(/Join Jam/g)).toHaveLength(1);
  expect(button!.props?.className).toBe('mt-2 w-full');
  tree.unmount();
});

test('7. button is a pure navigation trigger — capacity gated in JamSession, not here', () => {
  mockJamState = { active: true };
  // FullEvent has no capacity/attendee model; JamSession → JamRoom owns that gate.
  // The button simply navigates regardless of room capacity.
  const tree = render(BASE_POST);
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Join Jam');
  const button = joinButton(tree.toJSON() as unknown as TreeNode);
  expect(button).toBeDefined();
  ReactTestRenderer.act(() => {
    (button!.props?.onPress as () => void)();
  });
  expect(mockNavigate).toHaveBeenCalledWith('JamSession', {
    jamId: 'post-1',
    occurrence: undefined,
  });
  tree.unmount();
});
