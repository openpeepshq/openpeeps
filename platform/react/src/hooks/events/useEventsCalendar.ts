import { useMemo, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  groupPostsByDay,
  localDateKey,
  monthCells,
} from '../../components/post/feed/events/eventCalendar';

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

/** Derived scope shape for calendar consumption. */
export type CalendarScope = { mine?: boolean; groupId?: string };

const WEEKDAY_START = new Date(2026, 0, 4);

/** Local day bounds as ISO datetimes (e.g. 2026-10-04T00:00:00-04:00). */
const localIso = (date: Date): string => {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const pad = (value: number) => String(Math.abs(value)).padStart(2, '0');
  const tz = `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
  const padDate = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}` +
    `T${padDate(date.getHours())}:${padDate(date.getMinutes())}:${padDate(date.getSeconds())}${tz}`
  );
};

/** [from, to) covering the padded month grid exactly, in local time. */
export const monthRangeWindow = (year: number, month: number) => {
  const cells = monthCells(year, month);
  const firstCell = cells[0]!;
  const lastCell = cells.at(-1)!;
  const first = dateFromDayKey(firstCell.key);
  const last = dateFromDayKey(lastCell.key);
  const to = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return { from: localIso(first), to: localIso(to) };
};

/**
 * Date-centered events calendar hook — replaces the old window-anchored feed
 * paging model. Computes a `[from, to)` window directly from the rendered month
 * grid, fetches via `listEventsInRange`, then buckets occurrences by browser-local
 * day keys (`YYYY-MM-DD`). The Upcoming/Current/Past **lists** keep the existing
 * windowed feeds unchanged.
 */
export const useEventsCalendar = (scope: CalendarScope = {}) => {
  const { openpeepsApi } = useOpenpeeps();
  const initial = new Date();
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(localDateKey(initial));

  const cells = useMemo(
    () => monthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const { from, to } = useMemo(
    () => monthRangeWindow(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  // Hooks must not depend on `scope` — the apiHook result type is identical
  // across the three endpoints, so we can narrow by scope safely.
  const publicRange = openpeepsApi.useEventsCalendarRange(from, to);
  const myRange = openpeepsApi.useEventsCalendarMyRange(from, to);
  const groupRange = openpeepsApi.useEventsCalendarGroupRange(
    scope.groupId ?? '',
    from,
    to,
  );
  const mine = scope.mine ?? false;
  const posts: UseInfiniteQueryResult<
    InfiniteData<PublicPost[]>,
    unknown
  > = mine ? myRange : scope.groupId ? groupRange : publicRange;

  const byDay = useMemo(() => {
    // Range rows are one per occurrence; drop any duplicate rows defensively.
    const rows: PublicPost[] = [];
    const seen = new Set<string>();
    for (const post of posts.data?.pages.flat() ?? []) {
      const key = `${post.id}:${post.occurrenceRecurrenceId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(post);
    }
    return groupPostsByDay(rows);
  }, [posts.data]);

  const todayKey = localDateKey(new Date());
  const inMonthKeys = cells
    .filter((cell) => cell.inMonth)
    .map((cell) => cell.key);
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
    isLoading: posts.isLoading,
    isFetching: posts.isFetching,
    shiftMonth,
    goToday,
  };
};
