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

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  ScrollView: (props: { children?: unknown }) =>
    React.createElement('ScrollView', null, props.children),
  Pressable: (props: { children?: unknown }) =>
    React.createElement('Pressable', null, props.children),
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

const { JamPeopleDrawer } = require('./JamPeopleDrawer');

const renderDrawer = (sessions: number, waitingRoom: boolean = false) => {
  mockSessions = sessions;
  mockIsModerator = waitingRoom;
  mockHasWaitingRoom = waitingRoom;
  mockWaitingProfiles = waitingRoom ? [{ id: 'w1' }] : [];
  mockRenderedTexts.length = 0;
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
