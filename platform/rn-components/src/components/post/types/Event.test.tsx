/**
 * Feed card timezone for #2129: the RN feed event previously rendered
 * `formatEventDate` in the device zone (and tagged the row with the raw
 * event zone). It must render through `useEventDisplayTimeZone` (profile
 * settings → community default → event zone) and append the
 * `events.inYourTimeZone` suffix only when the display zone differs from
 * the event zone.
 *
 * Follows FullEvent.test.tsx's mock style: jest node env, all external
 * imports mocked, only the date-row logic exercised.
 */
import ReactTestRenderer from 'react-test-renderer';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Shared UTC instant: 2026-10-05T19:30:00Z reads 3:30 PM in America/New_York
// and 2:30 PM in America/Chicago (the #2129 repro values).
const START = '2026-10-05T19:30:00Z';
const END = '2026-10-05T20:30:00Z';
const post = {
  id: 'p1',
  data: {
    type: 'event',
    name: 'Office Hours',
    start: START,
    end: END,
    timeZone: 'America/Chicago',
  },
} as never;

let mockProfileSettingsTimeZone: string | undefined;
let mockCommunityDefaultTimeZone: string | undefined;

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: unknown }) =>
    React.createElement(tag, null, props.children);
  return {
    View: make('View'),
    Pressable: make('Pressable'),
  };
});

// --- i18n: resolve keys to their defaultValue -----------------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

// --- @openpeepshq/react: hook contract = profile → community → event -----
jest.mock('@openpeepshq/react', () => ({
  useEventDisplayTimeZone: (eventTimeZone?: string | null) => {
    const isIana = (tz?: string | null): tz is string => {
      if (!tz) return false;
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    };
    return (
      (isIana(mockProfileSettingsTimeZone)
        ? mockProfileSettingsTimeZone
        : undefined) ??
      (isIana(mockCommunityDefaultTimeZone)
        ? mockCommunityDefaultTimeZone
        : undefined) ??
      (isIana(eventTimeZone) ? eventTimeZone : undefined)
    );
  },
}));

jest.mock('@openpeepshq/common', () => ({}));
jest.mock('@openpeepshq/common/lib', () => ({
  formatEventRecurrence: () => '',
  // `lib/utils` `formatEventDate` spreads this for the `timeZone` option.
  eventTimeZoneOptions: (tz?: string | null) => (tz ? { timeZone: tz } : {}),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));
// `lib/utils` (the real `formatEventDate` under test) transitively imports
// react-native-config via lib/constants — mock the constants module only,
// the same way FullEvent.test.tsx does.
jest.mock('../../../lib/constants', () => ({
  BASE_URL: 'http://localhost',
}));
jest.mock('../../custom/common/index', () => ({
  CachedImage: () => null,
}));
jest.mock('../../custom/common/participant-avatar', () => ({
  ParticipantAvatar: () => null,
}));
jest.mock('../../ui/themed-text', () => ({
  ThemedText: ({ children }: { children?: unknown }) => children,
}));
jest.mock('../../ui/button', () => ({
  Button: ({ children }: { children?: unknown }) => children,
}));

// The component under test (after the mocks above are registered).
import { FeedEvent } from './Event';

const textOf = (tree: ReactTestRenderer.ReactTestRendererJSON) => {
  // react-test-renderer JSON: text nodes are plain strings inside `children`.
  const walk = (
    node: ReactTestRenderer.ReactTestRendererTree | string | null
  ): string =>
    typeof node === 'string'
      ? node
      : !node
        ? ''
        : (node.children ?? []).map(walk).join('');
  return Array.isArray(tree) ? tree.map(walk).join('') : walk(tree);
};

const render = () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  // `act`-wrapped create, matching FullEvent.test.tsx; the caller unmounts
  // in a `finally` so no renderer leaks across tests.
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<FeedEvent post={post} />);
  });
  return {
    text: textOf(tree.toJSON() as ReactTestRenderer.ReactTestRendererJSON),
    unmount: () => ReactTestRenderer.act(() => tree.unmount()),
  };
};

describe('FeedEvent display timezone (#2129)', () => {
  beforeEach(() => {
    mockProfileSettingsTimeZone = undefined;
    mockCommunityDefaultTimeZone = undefined;
  });

  it('renders the feed row in the profile settings zone, with the suffix', () => {
    // The viewer's profile zone is New York; the event zone is Chicago.
    // The row must read New York wall time and carry the suffix.
    mockProfileSettingsTimeZone = 'America/New_York';
    const inTz = (iso: string, tz: string) =>
      new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: tz,
      });
    const { text, unmount } = render();
    try {
      expect(text).toContain(inTz(START, 'America/New_York'));
      expect(text).toContain(inTz(END, 'America/New_York'));
      expect(text).not.toContain(inTz(START, 'America/Chicago'));
      expect(text).toContain('in your time zone');
    } finally {
      unmount();
    }
  });

  it('omits the suffix when the display zone equals the event zone', () => {
    // No profile/community tier → the event zone (Chicago) is the display
    // zone, so 19:30 UTC reads 2:30 PM and no suffix is appended.
    const { text, unmount } = render();
    try {
      expect(text).toContain('2:30 PM');
      expect(text).not.toContain('in your time zone');
    } finally {
      unmount();
    }
  });
});
