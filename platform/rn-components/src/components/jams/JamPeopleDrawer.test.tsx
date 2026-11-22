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

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
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
    admittingId: null,
    admit: () => {},
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
  const make = (name: string) => (props: Record<string, unknown>) =>
    React.createElement(name, props);
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
    WifiOffIcon: make('WifiOffIcon'),
  };
});

jest.mock('../ui/button', () => ({
  Button: (props: { children?: unknown }) =>
    React.createElement('Button', null, props.children),
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
  ThemedText: (props: { children?: unknown; className?: string }) => {
    const c = props.children;
    if (typeof c === 'string' && c) mockRenderedTexts.push(c);
    else if (Array.isArray(c)) {
      for (const part of c) {
        if (typeof part === 'string' && part) mockRenderedTexts.push(part);
      }
    }
    return React.createElement('ThemedText', { className: props.className }, c);
  },
}));

// The package ships ESM-only source (see the jest.config.cjs notes); the
// drawer only calls Toast.show for lift-ban errors, which these cases never
// reach, so an inert mock keeps the suite parseable.
jest.mock('react-native-toast-message', () => {
  const Toast = { show: jest.fn() };
  return { __esModule: true, default: Toast };
});

const { JamPeopleDrawer } = require('./JamPeopleDrawer');

const renderDrawer = (
  sessions: number,
  waitingRoom: boolean = false,
  bannedIds: string[] = []
) => {
  mockSessions = sessions;
  mockIsModerator = waitingRoom;
  mockHasWaitingRoom = waitingRoom;
  mockWaitingProfiles = waitingRoom ? [{ id: 'w1' }] : [];
  mockBannedIds = bannedIds;
  mockRenderedTexts.length = 0;
  mockPressHandlers.length = 0;
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

describe('JamPeopleDrawer "Removed" sublist fallback (RN, issue #303 round-15 suggestion 2)', () => {
  // Independent of the observers renderDrawer: the fallback case needs a
  // moderator with a non-empty banned list but no waiting room / participants,
  // which the observers helper (isModerator === waitingRoom) cannot express.
  const renderBannedDrawer = (bannedIds: string[]) => {
    mockIsModerator = true;
    mockHasWaitingRoom = false;
    mockWaitingProfiles = [];
    mockBannedIds = bannedIds;
    mockRenderedTexts.length = 0;
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
