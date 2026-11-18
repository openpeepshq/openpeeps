import { useEffect, useMemo, useState } from 'react';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type {
  PublicPost,
  SuccessFailureResponse,
} from '@openpeepshq/common/types';
import {
  endOfMonth,
  eventStartIso,
  expandRecurringAgendaPosts,
  groupPostsByDay,
  localDateKey,
  monthCells,
  shouldFetchMoreAgenda,
  startOfMonth,
  uniquePosts,
  type EventsAgendaWindow,
} from '../../components/post/feed/events/eventCalendar';

export type EventsCalendarQuery = UseInfiniteQueryResult<
  InfiniteData<PublicPost[], unknown>,
  SuccessFailureResponse
>;

const WEEKDAY_START = new Date(2026, 0, 4);

/**
 * The window guard inside the hook compares against a `now` captured at
 * render time. Re-ticking it every minute keeps the calendar aligned with
 * the agenda lists' refetch cadence (`AGENDA_REFETCH_INTERVAL_MS` in
 * `hooks/posts.ts`): an event that ends in the next minute leaves both the
 * list and the calendar within a minute of it happening, not only when the
 * next refetch or tab switch re-renders.
 */
const NOW_TICK_MS = 60_000;

export const eventName = (post: PublicPost): string =>
  post.data.type === 'event' ? post.data.name?.trim() || '-' : '-';

export const dayNumber = (key: string): string =>
  String(Number(key.slice(8, 10)));

export const dateFromDayKey = (key: string): Date =>
  new Date(
    Number(key.slice(0, 4)),
    Number(key.slice(5, 7)) - 1,
    Number(key.slice(8, 10)),
  );

/**
 * Month cursor, selected day and agenda paging for the events calendar. Pulls
 * further pages while the visible month is not yet covered by loaded events.
 */
export const useEventsCalendar = (
  query: EventsCalendarQuery,
  agenda: EventsAgendaWindow,
) => {
  const [now, setNow] = useState(() => new Date());
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(localDateKey(now));

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), NOW_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const posts = useMemo(
    () => uniquePosts(query.data?.pages),
    [query.data?.pages],
  );
  const calendarPosts = useMemo(
    () => expandRecurringAgendaPosts(posts, agenda, now),
    [agenda, posts, now],
  );
  const byDay = useMemo(() => groupPostsByDay(calendarPosts), [calendarPosts]);
  const cells = useMemo(
    () => monthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
  const inMonthKeys = cells
    .filter((cell) => cell.inMonth)
    .map((cell) => cell.key);
  const todayKey = localDateKey(now);
  const visible = cells.some((cell) => cell.key === selectedKey);
  const selected = visible
    ? selectedKey
    : inMonthKeys.includes(todayKey)
      ? todayKey
      : (inMonthKeys[0] ?? todayKey);
  const selectedEvents = byDay.get(selected) ?? [];
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(
      WEEKDAY_START.getFullYear(),
      WEEKDAY_START.getMonth(),
      WEEKDAY_START.getDate() + index,
    ).toLocaleDateString(undefined, { weekday: 'short' }),
  );
  const selectedLabel = dateFromDayKey(selected).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const {
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isError,
    fetchNextPage,
    data,
  } = query;

  useEffect(() => {
    if (isLoading || isFetchingNextPage || isError) return;
    const fetchMore = shouldFetchMoreAgenda({
      window: agenda,
      starts: posts.map(eventStartIso),
      rangeStart: startOfMonth(cursor.year, cursor.month),
      rangeEnd: endOfMonth(cursor.year, cursor.month),
      hasNextPage: !!hasNextPage,
      pagesLoaded: data?.pages.length ?? 0,
    });
    if (fetchMore) void fetchNextPage();
  }, [
    cursor.month,
    cursor.year,
    data?.pages.length,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    agenda,
    posts,
  ]);

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedKey(localDateKey(now));
  };

  return {
    cells,
    byDay,
    todayKey,
    selected,
    selectedEvents,
    selectedLabel,
    setSelectedKey,
    monthLabel,
    weekdayLabels,
    isLoading,
    isFetchingNextPage,
    shiftMonth,
    goToday,
  };
};
