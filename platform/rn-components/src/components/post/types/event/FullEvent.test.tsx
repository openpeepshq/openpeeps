/**
 * Tests for FullEvent — specifically that the Jam URL on the single event
 * page is tappable and navigates to JamSession with the correct params.
 *
 * Regression test for PR #2085 / issue #2063:
 * - tapping the Jam URL navigates to JamSession({ jamId, occurrence })
 * - the pressable is screen-reader accessible and has a comfortable tap target
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// ─── react-native mocks ─────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockUseNavigation = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('react-native', () => {
  const View = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) => React.createElement('View', { testID: 'view', ...props }, children);
  const Text = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) => React.createElement('Text', { testID: 'text', ...props }, children);
  const Image = ({ ...props }: { [k: string]: unknown }) =>
    React.createElement('Image', { testID: 'image', ...props });
  const TouchableOpacity = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement(
      'TouchableOpacity',
      { testID: 'touchable', ...props },
      children
    );
  return {
    View,
    Text,
    Image,
    TouchableOpacity,
    Share: { share: jest.fn() },
    Platform: { OS: 'ios' },
    StyleSheet: { create: (s: unknown) => s },
    Animated: { View },
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: mockUseNavigation,
}));

// ─── component-local mocks ──────────────────────────────────────────
jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    currentProfile: {
      id: 'profile-1',
      type: 'local' as const,
      handle: 'test',
    },
    openpeepsApi: {
      rsvpManageAction: jest.fn(() => jest.fn()),
      useJamAttendance: jest.fn(() => ({ data: [], isSuccess: true })),
      useJamState: jest.fn(() => ({ data: null })),
      usePostRecordings: jest.fn(() => ({ data: [], isSuccess: true })),
      usePostContext: jest.fn(() => ({ data: null })),
    },
    client: { posts: { exportRsvps: jest.fn() } },
  }),
  useServerInfo: () => ({ jams: { livekit: { enabled: false } } }),
}));

jest.mock('@openpeepshq/common', () => ({
  buildThreads: (d: unknown) => (d ? [] : []),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('react-native-fs', () => ({ CachesDirectoryPath: '/caches' }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));
jest.mock('react-native-gesture-handler', () => ({
  RectButton: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('RectButton', { testID: 'rect' }, children),
  State: {},
}));

// UI piece mocks
jest.mock('../../../ui/themed-text', () => ({
  ThemedText: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement('span', { testID: 'themed-text', ...props }, children),
}));

jest.mock('../../../ui/themed-view', () => ({
  ThemedView: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement('div', { testID: 'themed-view', ...props }, children),
}));

jest.mock('../../../ui/button', () => ({
  Button: ({
    children,
    onPress,
    className,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement(
      'button',
      { testID: 'button', onPress, className, ...props },
      children
    ),
}));

jest.mock('../../../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) =>
    children,
  DropdownMenuGroup: ({ children }: { children?: React.ReactNode }) => children,
  DropdownMenuItem: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [k: string]: unknown;
  }) =>
    React.createElement(
      'span',
      { testID: 'dropdown-item', ...props },
      children
    ),
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) =>
    children,
}));

jest.mock('../../../ui/tabs', () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => children,
  TabsContent: ({ children }: { children?: React.ReactNode }) => children,
  TabsList: ({ children }: { children?: React.ReactNode }) => children,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('../../../custom/date/updating-date', () => ({
  UpdatingDate: () =>
    React.createElement('span', { testID: 'updating-date' }, ''),
}));

jest.mock('../../pieces/VideoPlayer', () => ({
  VideoPlayer: () => React.createElement('span', { testID: 'video-player' }),
}));

jest.mock('../../../profile/Avatar', () => ({
  ProfileAvatar: () =>
    React.createElement('span', { testID: 'profile-avatar' }),
}));

jest.mock('../../../profile/ProfileFromId', () => ({
  ProfileFromId: () =>
    React.createElement('span', { testID: 'profile-from-id' }),
}));

jest.mock('../../pieces/EventOccurrenceList', () => ({
  EventOccurrenceList: () =>
    React.createElement('span', { testID: 'occurrence-list' }),
}));

jest.mock('../../pieces/EventRsvpList', () => ({
  EventRsvpList: () => React.createElement('span', { testID: 'rsvp-list' }),
}));

jest.mock('../../../stores/useNewConversationStore', () => ({
  useNewConversationStore: () => ({ setContt: jest.fn() }),
}));

jest.mock('../../../lib/bottom-sheet-ref', () => ({
  bottomSheetPresent: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetModal: jest.fn() }));

// Post pieces
jest.mock('../../index', () => ({
  EventMenu: () => null,
  EventRsvpButton: () => React.createElement('span', { testID: 'rsvp-button' }),
  ReplyBox: () => null,
  ShareMenu: ({ children }: { children?: React.ReactNode }) => children,
  ThreadedFeed: () => null,
  useNewPostModal: () => ({ openNewPost: jest.fn() }),
}));

jest.mock('../../../profile/index', () => ({
  ReportProfileOrPostModal: () => null,
}));

jest.mock('../../../markdown/index', () => ({
  OpenpeepsMarkdown: () => React.createElement('span', { testID: 'markdown' }),
}));

jest.mock('../../../../lib/downloadFile', () => ({
  downloadDocument: jest.fn(),
}));

jest.mock('../../../custom/modals/common', () => ({
  BaseSheet: ({ children }: { children?: React.ReactNode }) => children,
  SheetFooter: () => null,
}));

jest.mock('../../../hooks/use-controlled-sheet', () => ({
  useControlledSheet: (_state: boolean) => [null, jest.fn(() => {})] as const,
}));

// ─── helpers ─────────────────────────────────────────────────────────
const makeEventPost = (
  eventJam: boolean,
  occurrenceId?: string
): {
  post: {
    id: string;
    profile?: { id: string };
    groupId?: string;
    visibility?: string;
    data?: unknown;
    url?: string;
  };
  occurrence?: string;
} => ({
  post: {
    id: 'post-123',
    profile: { id: 'profile-1' },
    visibility: 'public',
    data: {
      event: true,
      jam: eventJam,
      name: 'Test Event',
      start: new Date().toISOString(),
      recurrence: undefined,
      physicalLocation: undefined,
    },
  },
  occurrence: occurrenceId,
});

const renderFullEvent = (eventJam: boolean, occurrenceId?: string) => {
  const { FullEvent } = require('./FullEvent');
  const { post, occurrence } = makeEventPost(eventJam, occurrenceId);
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(FullEvent, { post, occurrence })
    );
  });
  return { tree, post, occurrence };
};

// ─── tests ───────────────────────────────────────────────────────────
describe('FullEvent — Jam URL tappable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('renders a Jam Session for a jam event', () => {
    const { tree } = renderFullEvent(true);
    const spans = tree.root.findAllByType('span');
    const texts = spans
      .filter((s) => s.props.testID === 'themed-text')
      .map((s) => s.props.children);
    // "Jam Event" label should be present
    expect(texts).toContain('Jam Event');
    tree.unmount();
  });

  it('navigates to JamSession with jamId when Jam URL is pressed (no occurrence)', () => {
    const { tree } = renderFullEvent(true);
    const pressable = tree.root.findByProps({
      accessibilityLabel: 'https://example.openpeeps.org/events/post-123/jam',
    });
    ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('JamSession', {
      jamId: 'post-123',
      occurrence: undefined,
    });
    tree.unmount();
  });

  it('navigates to JamSession with jamId AND occurrence when pressing the Jam URL on a recurring event', () => {
    const occurrenceId = 'occr-456';
    const { tree } = renderFullEvent(true, occurrenceId);
    const pressable = tree.root.findByProps({
      accessibilityLabel: `https://example.openpeeps.org/events/post-123/jam?occurrence=${encodeURIComponent(
        occurrenceId
      )}`,
    });
    ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('JamSession', {
      jamId: 'post-123',
      occurrence: occurrenceId,
    });
    tree.unmount();
  });

  it('has accessibilityRole="link" on the Jam URL pressable', () => {
    const { tree } = renderFullEvent(true);
    const pressable = tree.root.findByProps({ accessibilityRole: 'link' });
    expect(pressable).toBeDefined();
    tree.unmount();
  });

  it('has activeOpacity set on the Jam URL pressable', () => {
    const { tree } = renderFullEvent(true);
    const pressable = tree.root.findByProps({ activeOpacity: 0.7 });
    expect(pressable).toBeDefined();
    tree.unmount();
  });

  it('has padding (py-1) on the Jam URL pressable for a comfortable tap target', () => {
    const { tree } = renderFullEvent(true);
    const pressable = tree.root.findByProps({
      className: expect.stringContaining('py-1'),
    });
    expect(pressable).toBeDefined();
    tree.unmount();
  });

  it('long-pressing the Jam URL copies the full URL to clipboard', () => {
    const { tree } = renderFullEvent(true, 'occr-456');
    const pressable = tree.root.findByProps({
      accessibilityLabel: `https://example.openpeeps.org/events/post-123/jam?occurrence=${encodeURIComponent(
        'occr-456'
      )}`,
    });
    const { setString } = require('@react-native-clipboard/clipboard');
    ReactTestRenderer.act(() => {
      pressable.props.onLongPress();
    });
    expect(setString).toHaveBeenCalledWith(
      `https://example.openpeeps.org/events/post-123/jam?occurrence=${encodeURIComponent(
        'occr-456'
      )}`
    );
    tree.unmount();
  });
});
