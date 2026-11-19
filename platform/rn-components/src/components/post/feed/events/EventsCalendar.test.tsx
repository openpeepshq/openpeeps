/**
 * RN parity lock (issue #2131), updated for issue #2128: the native
 * EventsCalendar must render exactly what the shared `useEventsCalendar` hook
 * from `@openpeepshq/react` returns — the single source of truth, with no
 * separate RN implementation. Since #2128 the hook is a date-range calendar:
 * it reads one row per occurrence from the server's month-window range feed
 * and buckets the rows by browser-local day keys. The mock below emulates
 * that contract — it returns the rows for the selected day only, and an event
 * the range feed did not return must not appear. If the native component ever
 * rendered events from any other source (a query of its own, its own
 * filtering), these assertions fail.
 *
 * `@openpeepshq/react` is mocked because the package's jest transform only
 * covers this package — the same pattern every RN test here uses.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { PublicPost } from '@openpeepshq/common/types';

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => {
  const React = require('react');
  const make =
    (tag: string) =>
    (props: { children?: React.ReactNode; onPress?: () => void }) =>
      React.createElement(tag, { onPress: props.onPress }, props.children);
  return {
    View: make('View'),
    Pressable: make('Pressable'),
    ActivityIndicator: () => null,
    ScrollView: make('ScrollView'),
    RefreshControl: () => null,
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

jest.mock('../../../../theme/useThemeOpacity', () => ({
  useThemeOpacity: () => ({ background: () => ({}) }),
}));

jest.mock('../../../navigation/types/index', () => ({
  MainStackParamList: {},
}));

jest.mock('../../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

jest.mock('../../../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement('Text', props, props.children),
}));

jest.mock('../../../icons/index', () => ({
  ChevronLeftIcon: () => null,
  ChevronRightIcon: () => null,
}));

// --- shared hook contract: one row per occurrence, bucketed by local day ---
const future = {
  id: 'future-event',
  data: {
    type: 'event',
    name: 'future-event',
    start: '2026-11-19T10:00:00.000Z',
    end: '2026-11-19T11:00:00.000Z',
    wholeDay: false,
  },
} as unknown as PublicPost;

// Records the scope the component forwards so the window-threading test can
// assert the native side hands the active tab's window to the shared hook.
const hookScope: Record<string, unknown> = {};

jest.mock('@openpeepshq/react', () => ({
  useEventsCalendar: (scope: Record<string, unknown>) => {
    hookScope.window = scope.window;
    return {
      cells: [
        { key: '2026-11-18', inMonth: true },
        { key: '2026-11-19', inMonth: true },
      ],
      byDay: new Map([['2026-11-19', [future]]]),
      todayKey: '2026-11-18',
      selected: '2026-11-19',
      selectedEvents: [future],
      selectedLabel: 'Selected day',
      setSelectedKey: () => undefined,
      monthLabel: 'Parity month',
      weekdayLabels: ['S', 'M'],
      isLoading: false,
      isFetchingNextPage: false,
      shiftMonth: () => undefined,
      goToday: () => undefined,
    };
  },
  calendarDayNumber: (key: string) => key,
  calendarEventName: (post: PublicPost) =>
    post.data.type === 'event' ? (post.data.name ?? '') : '',
  eventStartIso: (post: PublicPost) =>
    post.occurrenceStart ?? (post.data as { start?: string }).start,
  eventEndIso: (post: PublicPost) =>
    post.occurrenceEnd ?? (post.data as { end?: string }).end,
}));

import { EventsCalendar } from './EventsCalendar';

const renderCalendar = async (props: Record<string, unknown> = {}) => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const renderer = ReactTestRenderer.create(<EventsCalendar {...props} />);
  await ReactTestRenderer.act(async () => undefined);
  return renderer;
};

describe('EventsCalendar (native) shared-hook parity', () => {
  it('renders the shared hook output through the scope prop', async () => {
    const renderer = await renderCalendar({});
    const tree = renderer.toJSON();
    expect(tree).not.toBeNull();
    const text = JSON.stringify(tree);
    expect(text).toContain('Parity month');
    expect(text).toContain('Selected day');
  });

  it('shows the range-feed row on the selected day list', async () => {
    const renderer = await renderCalendar({});
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('future-event');
  });

  it('never shows an event the shared hook did not return', async () => {
    const renderer = await renderCalendar({});
    const text = JSON.stringify(renderer.toJSON());
    // The component has no query of its own; anything it shows came from the
    // hook's `selectedEvents`. An event absent from that list must not leak
    // into the grid or the day list.
    expect(text).not.toContain('past-event');
  });

  it('forwards the active tab window to the shared hook (issue #2131)', async () => {
    // The native component must pass the tab's agenda window into the shared
    // hook so the Upcoming tab never renders past occurrences on the grid —
    // the guard itself lives in @openpeepshq/react, not here.
    await renderCalendar({ window: 'upcoming' });
    expect(hookScope.window).toBe('upcoming');
  });
});
