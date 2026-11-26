/**
 * Web/native parity pin for the People-drawer `Observers` section (issue #163).
 *
 * The web side of the same section is pinned in
 * `platform/react/.../JamRoomIndicators.test.tsx`; this file pins the React
 * Native `JamPeopleDrawer` so the required parity (AGENTS.md) is enforced on
 * both platforms: the hidden external-session count renders under its own
 * `Observers` heading, placed below the "In jam" heading, and the whole
 * section is hidden while no external sessions are connected.
 *
 * Only the RN surface, livekit and i18n are stubbed. `ThemedText` is the
 * single text primitive the drawer renders through, so the mock records every
 * rendered label in document order (`mockRenderedTexts`) — the assertions read
 * that ordered log instead of walking the rendered tree.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Every label the drawer renders through ThemedText, in document order.
const mockRenderedTexts: string[] = [];
let mockSessions = 0;
const mockParticipants: unknown[] = [];
let mockIsModerator = false;
let mockHasWaitingRoom = false;
let mockWaitingProfiles: unknown[] = [];
let mockBannedIds: string[] = [];
const mockPressHandlers: Array<() => void> = [];
// Busy state for the waiting-room action row (mirrors `useJamPeople`).
let mockAdmittingId: string | null = null;
let mockRejectingId: string | null = null;
// Waiting-room stream failure (mirrors `useJamPeople.waitingRoomError`).
let mockWaitingRoomError: string | null = null;
// Every rendered action-button and its props, in document order.
const mockButtonProps: Array<Record<string, unknown>> = [];
// Every rendered View className (pins the action group's layout classes).
const mockViewClasses: string[] = [];
// Every rendered ThemedText with accessibilityRole="alert", in document
// order (pins the waiting-room stream-error alert, mirroring the web
// drawer's role="alert" paragraph).
const mockAlertRoles: string[] = [];
// Every rendered icon, in document order (recorded by the icon stub).
const mockIconNames: string[] = [];

jest.mock('react-native', () => ({
  View: (props: { children?: unknown; className?: string }) => {
    if (props.className) mockViewClasses.push(props.className);
    return React.createElement('View', null, props.children);
  },
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
  // Records every press handler in render order so a test can fire the
  // "Removed" header toggle (the only Pressable when the drawer has no
  // participants / waiting room — see the round-15 suggestion-2 case).
  Pressable: (props: { children?: unknown; onPress?: () => void }) => {
    if (props.onPress) mockPressHandlers.push(props.onPress);
    return React.createElement('Pressable', null, props.children);
  },
  Text: (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children),
}));

jest.mock('@livekit/react-native', () => ({
  useParticipants: () => mockParticipants,
  useRoomContext: () => ({}),
  useLocalParticipant: () => ({ localParticipant: {} }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Values mirror `platform/i18n/src/locales/en.json` (plural branches
    // included) so the rendered copy pins the key/count usage.
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'jams.people.inJam') return 'In jam';
      if (key === 'jams.people.observers') return 'Observers';
      if (key === 'jams.people.inWaitingRoom') return 'Waiting room';
      if (key === 'jams.people.noParticipants') return 'No participants found';
      if (key === 'jams.waitingRoom.admitParticipant') return 'Admit';
      if (key === 'jams.waitingRoom.admitting') return 'Admitting\u2026';
      if (key === 'jams.waitingRoom.rejectParticipant') return 'Reject';
      if (key === 'jams.waitingRoom.rejecting') return 'Rejecting\u2026';
      if (key === 'jams.waitingRoom.streamError')
        return 'Unable to reach the waiting room';
      if (key === 'jams.drawer.peopleTitle') return 'People';
      if (key === 'jams.drawer.close') return 'Close';
      if (key === 'jams.drawer.searchPeoplePlaceholder') return 'Search';
      if (key === 'jams.observers.count') {
        const count = Number(opts?.count ?? 0);
        return count === 1
          ? '1 external observer'
          : `${count} external observers`;
      }
      return key;
    },
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useJamExternalSessions: () => mockSessions,
  parseParticipantMetadata: () => ({ profile: null }),
  useJamPeople: () => ({
    isModerator: mockIsModerator,
    hasWaitingRoom: mockHasWaitingRoom,
    moderatorIds: [],
    raisedHands: new Set<string>(),
    query: '',
    setQuery: () => {},
    listedParticipants: mockParticipants,
    waitingProfiles: mockWaitingProfiles,
    waitingRoomError: mockWaitingRoomError,
    admittingId: mockAdmittingId,
    rejectingId: mockRejectingId,
    admit: () => {},
    reject: () => {},
    // Mirror the real hook's banned-sublist contract (the drawer reads
    // bannedIds/liftingId/liftBan when isModerator is true); empty keeps the
    // "Removed" section hidden so these assertions stay on the Observers pin.
    bannedIds: mockBannedIds,
    liftingId: null,
    liftBan: () => {},
  }),
  // The "Removed" sublist row resolves each banned id through
  // `openpeepsApi.useProfile(id).data`; returning `undefined` exercises the
  // unresolved fallback (the full profile id) that round-15 suggestion 2 pins.
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfile: () => ({ data: undefined }),
    },
  }),
}));

jest.mock('@openpeepshq/common/lib', () => ({
  profileName: () => 'profile',
  waitingRoomEntryName: () => 'waiting',
}));

jest.mock('../icons/index', () => {
  const make = (name: string) => (props: Record<string, unknown>) => {
    mockIconNames.push(name);
    return React.createElement(name, props);
  };
  return {
    AudioLinesIcon: make('AudioLinesIcon'),
    ChevronDownIcon: make('ChevronDownIcon'),
    ChevronRightIcon: make('ChevronRightIcon'),
    EyeOnIcon: make('EyeOnIcon'),
    HandIcon: make('HandIcon'),
    MicIcon: make('MicIcon'),
    MicOffIcon: make('MicOffIcon'),
    SearchIcon: make('SearchIcon'),
    UserRoundCheckIcon: make('UserRoundCheckIcon'),
    UserRoundXIcon: make('UserRoundXIcon'),
    WifiOffIcon: make('WifiOffIcon'),
  };
});

jest.mock('../ui/button', () => ({
  Button: (props: { children?: unknown }) => {
    mockButtonProps.push(props as unknown as Record<string, unknown>);
    return React.createElement('Button', null, props.children);
  },
}));

jest.mock('../ui/input', () => ({
  Input: (props: { children?: unknown }) =>
    React.createElement('Input', null, props.children),
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: () => React.createElement('ProfileAvatar'),
}));

jest.mock('../../lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

// The drawer shell adds only chrome (title + close); the Observers section
// lives in the ScrollView content, so a passthrough keeps the assertions on
// the content that matters.
jest.mock('./JamDrawer', () => ({
  JamDrawer: (props: { children?: unknown }) =>
    React.createElement('JamDrawer', null, props.children),
}));

jest.mock('./useParticipantConnection', () => ({
  useConnectionLost: () => false,
  useConnectionQuality: () => 1,
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: {
    children?: unknown;
    className?: string;
    accessibilityRole?: string;
  }) => {
    const c = props.children;
    if (typeof c === 'string' && c) mockRenderedTexts.push(c);
    else if (Array.isArray(c)) {
      for (const part of c) {
        if (typeof part === 'string' && part) mockRenderedTexts.push(part);
      }
    }
    if (props.accessibilityRole === 'alert') mockAlertRoles.push('alert');
    return React.createElement('ThemedText', { className: props.className }, c);
  },
}));

// The package ships ESM-only source (see the jest.config.cjs notes); the
// drawer only calls Toast.show for waiting-room action feedback, which these
// cases never reach, so an inert mock keeps the suite parseable.
jest.mock('react-native-toast-message', () => {
  const Toast = { show: jest.fn() };
  return { __esModule: true, default: Toast };
});

const { JamPeopleDrawer } = require('./JamPeopleDrawer');

const renderDrawer = (
  sessions: number,
  waitingRoom: boolean = false,
  busy: { admittingId?: string | null; rejectingId?: string | null } = {},
  bannedIds: string[] = [],
  waitingRoomError: string | null = null
) => {
  mockSessions = sessions;
  mockIsModerator = waitingRoom;
  mockHasWaitingRoom = waitingRoom;
  mockWaitingProfiles = waitingRoom ? [{ id: 'w1' }] : [];
  mockBannedIds = bannedIds;
  mockWaitingRoomError = waitingRoomError;
  mockAdmittingId = busy.admittingId ?? null;
  mockRejectingId = busy.rejectingId ?? null;
  mockRenderedTexts.length = 0;
  mockButtonProps.length = 0;
  mockViewClasses.length = 0;
  mockIconNames.length = 0;
  mockPressHandlers.length = 0;
  mockAlertRoles.length = 0;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(JamPeopleDrawer, { open: true, onClose: () => {} })
    );
  });
  return tree;
};

describe('JamPeopleDrawer observers section (RN)', () => {
  it('renders the external-session count under its own heading below "In jam"', () => {
    renderDrawer(2);
    const texts = mockRenderedTexts;

    expect(texts).toContain('In jam');
    expect(texts).toContain('Observers');
    expect(texts).toContain('2 external observers');
    // The Observers section sits below the "In jam" section (document order).
    expect(texts.indexOf('In jam')).toBeLessThan(texts.indexOf('Observers'));
  });

  it('pins the Observers section between "In jam" and the waiting room', () => {
    // The web twin asserts the Observers heading's document position after
    // "In jam"; this pins the RN placement on both bounds (the lower bound
    // needs the waiting room rendered) so the section cannot be moved past it
    // — the web/native parity the earlier rounds established for this drawer.
    renderDrawer(2, true);
    const texts = mockRenderedTexts;

    expect(texts).toContain('In jam');
    expect(texts).toContain('Observers');
    expect(texts).toContain('2 external observers');
    expect(texts).toContain('Waiting room');
    // The count row follows its own heading…
    expect(texts.indexOf('Observers')).toBeLessThan(
      texts.indexOf('2 external observers')
    );
    // …and the whole Observers section sits between "In jam" and the
    // waiting room (document order), mirroring the web drawer.
    expect(texts.indexOf('In jam')).toBeLessThan(texts.indexOf('Observers'));
    expect(texts.indexOf('2 external observers')).toBeLessThan(
      texts.indexOf('Waiting room')
    );
  });

  it('renders the singular count for one connected session', () => {
    renderDrawer(1);
    expect(mockRenderedTexts).toContain('Observers');
    expect(mockRenderedTexts).toContain('1 external observer');
  });

  it('hides the Observers section while "In jam" still renders', () => {
    renderDrawer(0);
    const texts = mockRenderedTexts;

    expect(texts).toContain('In jam');
    expect(texts).not.toContain('Observers');
    expect(texts).not.toContain('external observer');
  });
});

describe('JamPeopleDrawer waiting-room action row (RN)', () => {
  it('pins the admit/reject row: labels, order, group layout, and icons', () => {
    renderDrawer(0, true);
    const texts = mockRenderedTexts;

    expect(texts).toContain('Waiting room');
    expect(texts).toContain('waiting');
    expect(texts).toContain('Admit');
    expect(texts).toContain('Reject');
    // The action row follows the queued profile name…
    expect(texts.indexOf('waiting')).toBeLessThan(texts.indexOf('Admit'));
    // …and Admit precedes Reject within the row.
    expect(texts.indexOf('Admit')).toBeLessThan(texts.indexOf('Reject'));

    // Exactly the two action buttons render, in order, both enabled.
    expect(mockButtonProps).toHaveLength(2);
    expect(mockButtonProps[0].accessibilityLabel).toBe('Admit');
    expect(mockButtonProps[1].accessibilityLabel).toBe('Reject');
    expect(mockButtonProps[0].disabled).toBe(false);
    expect(mockButtonProps[1].disabled).toBe(false);

    // The button group carries the non-wrapping layout class (round-2
    // finding), so it survives narrow-width Yoga shrinking.
    expect(mockViewClasses).toContain('flex-row shrink-0 items-center gap-1');

    // Both action icons render, check (admit) before x (reject).
    expect(mockIconNames).toContain('UserRoundCheckIcon');
    expect(mockIconNames).toContain('UserRoundXIcon');
    expect(mockIconNames.indexOf('UserRoundCheckIcon')).toBeLessThan(
      mockIconNames.indexOf('UserRoundXIcon')
    );
  });

  it('swaps the busy accessibilityLabel and disables both buttons while admitting', () => {
    renderDrawer(0, true, { admittingId: 'w1' });

    expect(mockButtonProps[0].accessibilityLabel).toBe('Admitting\u2026');
    expect(mockButtonProps[1].accessibilityLabel).toBe('Reject');
    expect(mockButtonProps[0].disabled).toBe(true);
    expect(mockButtonProps[1].disabled).toBe(true);
  });

  it('swaps the busy accessibilityLabel and disables both buttons while rejecting', () => {
    renderDrawer(0, true, { rejectingId: 'w1' });

    expect(mockButtonProps[0].accessibilityLabel).toBe('Admit');
    expect(mockButtonProps[1].accessibilityLabel).toBe('Rejecting\u2026');
    expect(mockButtonProps[0].disabled).toBe(true);
    expect(mockButtonProps[1].disabled).toBe(true);
  });

  it('hides the action row for non-moderators and without a waiting room', () => {
    renderDrawer(0);

    expect(mockButtonProps).toHaveLength(0);
    expect(mockRenderedTexts).not.toContain('Waiting room');
    expect(mockViewClasses).not.toContain(
      'flex-row shrink-0 items-center gap-1'
    );
  });
});

// Web/native parity for the waiting-room stream failure (review
// suggestion 1): the RN drawer renders the hook's `waitingRoomError` as an
// alert, replacing the queued-profile rows — mirroring the web drawer's
// role="alert" paragraph.
describe('JamPeopleDrawer waiting-room stream error (RN, web/native parity)', () => {
  it('renders the stream error as an alert instead of the queued-profile rows', () => {
    renderDrawer(0, true, {}, [], 'Unable to reach the waiting room');
    const texts = mockRenderedTexts;

    expect(texts).toContain('Waiting room');
    expect(texts).toContain('Unable to reach the waiting room');
    // The error replaces the rows: no profile name and no action buttons.
    expect(texts).not.toContain('waiting');
    expect(texts).not.toContain('Admit');
    expect(texts).not.toContain('Reject');
    expect(mockButtonProps).toHaveLength(0);
    // The alert role mirrors the web drawer's role="alert" paragraph.
    expect(mockAlertRoles).toEqual(['alert']);
  });

  it('renders the rows again once the stream error clears', () => {
    renderDrawer(0, true);
    expect(mockRenderedTexts).toContain('waiting');
    expect(mockRenderedTexts).toContain('Admit');
    expect(mockAlertRoles).toHaveLength(0);
  });
});

describe('JamPeopleDrawer "Removed" sublist fallback (RN, issue #303 round-15 suggestion 2)', () => {
  // Independent of the observers renderDrawer: the fallback case needs a
  // moderator with a non-empty banned list but no waiting room / participants,
  // which the observers helper (isModerator === waitingRoom) cannot express.
  const renderBannedDrawer = (bannedIds: string[]) => {
    mockIsModerator = true;
    mockHasWaitingRoom = false;
    mockWaitingProfiles = [];
    mockBannedIds = bannedIds;
    mockAdmittingId = null;
    mockRejectingId = null;
    mockRenderedTexts.length = 0;
    mockButtonProps.length = 0;
    mockViewClasses.length = 0;
    mockIconNames.length = 0;
    mockPressHandlers.length = 0;
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(JamPeopleDrawer, { open: true, onClose: () => {} })
      );
    });
    // The section is collapsed by default; fire the header toggle (the only
    // Pressable with an onPress when there are no participants / waiting room)
    // so the rows mount and their name fallbacks render.
    ReactTestRenderer.act(() => {
      mockPressHandlers.forEach((onPress) => onPress());
    });
    return tree;
  };

  it('shows the full profile id for an unresolved row, not a truncated slice', () => {
    // The useProfile mock returns undefined for every id, so the row hits the
    // unresolved fallback. Asserting the FULL id is present catches the old
    // raw-slice behavior (the first 8 chars only) — a 36-char id cannot appear
    // when only 8 chars are rendered.
    renderBannedDrawer(['banned-2x-0000-0000-0000-000000000000']);
    const text = mockRenderedTexts.join(' ');
    expect(text).toContain('banned-2x-0000-0000-0000-000000000000');
  });
});
