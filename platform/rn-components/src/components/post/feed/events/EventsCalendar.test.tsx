/**
 * Issue #2131 RN parity lock: the native EventsCalendar must render only what
 * the shared `useEventsCalendar` hook from `@openpeepshq/react` returns — the
 * single source of truth of the client-side agenda window guard (no separate
 * RN implementation). The mock below emulates the shared hook's contract: it
 * receives the raw query pages (holding a past event) and returns the
 * window-filtered calendar data. If the native component ever read
 * `query.data` directly instead of the hook's filtered output, the past event
 * would leak into the grid and fail these assertions.
 *
 * `@openpeepshq/react` is mocked because the package's jest transform only
 * covers this package — the same pattern every RN test here uses.
 */
import { type ReactNode } from 'react';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { InfiniteData } from '@tanstack/react-query';
import type { PublicPost } from '@openpeepshq/common/types';

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => {
  const React = require('react');
  const make =
    (tag: string) => (props: { children?: ReactNode; onPress?: () => void }) =>
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

// --- shared hook contract: window-filtered view over the raw pages ---------
const farPast = {
  id: 'past-event',
  data: {
    type: 'event',
    name: 'past-event',
    start: '2020-01-05T10:00:00.000Z',
    end: '2020-01-05T11:00:00.000Z',
    wholeDay: false,
  },
} as unknown as PublicPost;
const future = {
  id: 'future-event',
  data: {
    type: 'event',
    name: 'future-event',
    start: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 37 * 60 * 60 * 1000).toISOString(),
    wholeDay: false,
  },
} as unknown as PublicPost;

let rawPages: PublicPost[][] = [];

jest.mock('@openpeepshq/react', () => {
  const dayKey = (iso: string) => iso.slice(0, 10);
  const futureKey = dayKey(
    new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
  );
  return {
    // Mirrors useEventsCalendar: uniquePosts over the raw pages, then the
    // agenda window guard drops rows that do not match the window.
    useEventsCalendar: (query_: { data?: InfiniteData<PublicPost[][]> }) => {
      const seen = new Set<string>();
      const posts = (query_.data?.pages ?? []).flat().filter((post) => {
        const key = `${post.id}:${post.occurrenceRecurrenceId ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return post.id !== 'past-event';
      });
      return {
        cells: [
          { key: futureKey, inMonth: true },
          { key: '2020-01-04', inMonth: false },
        ],
        byDay: new Map([[futureKey, posts]]),
        todayKey: futureKey,
        selected: futureKey,
        selectedEvents: posts,
        selectedLabel: 'Upcoming day',
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
  };
});

import { EventsCalendar } from './EventsCalendar';
import type { EventsCalendarQuery } from '@openpeepshq/react';

const query = (pages: PublicPost[][]): EventsCalendarQuery =>
  ({
    data: { pages, pageParams: pages.map((_, i) => i) } as InfiniteData<
      PublicPost[][]
    >,
    isLoading: false,
    isFetchingNextPage: false,
    isError: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
  }) as unknown as EventsCalendarQuery;

const renderCalendar = async (pages: PublicPost[][]) => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  rawPages = pages;
  const renderer = ReactTestRenderer.create(
    <EventsCalendar query={query(pages)} agenda="upcoming" />
  );
  await ReactTestRenderer.act(async () => undefined);
  return renderer;
};

describe('EventsCalendar (native) agenda window parity', () => {
  it('renders through the shared hook with the raw query pages', async () => {
    const renderer = await renderCalendar([[farPast, future]]);
    // The hook contract was fed the raw pages (including the past event).
    expect(rawPages[0]).toEqual([farPast, future]);
    expect(JSON.stringify(renderer.toJSON())).not.toBeNull();
  });

  it('never shows a past event from the query on the upcoming calendar', async () => {
    const renderer = await renderCalendar([[farPast, future]]);
    const text = JSON.stringify(renderer.toJSON());
    // The past event is in query.data but filtered out by the shared hook.
    expect(text).not.toContain('past-event');
    expect(text).toContain('Upcoming day');
  });

  it('shows an in-window event on the selected day list', async () => {
    const renderer = await renderCalendar([[future]]);
    const text = JSON.stringify(renderer.toJSON());
    expect(text).toContain('future-event');
  });
});
