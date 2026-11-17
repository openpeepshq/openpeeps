import { useEffect, useMemo, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  eventStartIso,
  groupPostsByDay,
  localDateKey,
  monthCells,
} from '../../components/post/feed/events/eventCalendar';
import { useEvents, useUser } from '../../contexts/openpeeps';

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
type CalendarScope = { mine?: boolean; groupId?: string };

const WEEKDAY_START = new Date(2026, 0, 4);

/**
 * Date-centered events calendar hook — replaces the old window-anchored feed
 * paging model. Computes a `[from, to)` window directly from the rendered month
 * grid, fetches via `listEventsInRange`, then buckets occurrences by browser-local
 * day keys (`YYYY-MM-DD`). The Upcoming/Current/Past **lists** keep the existing
 * windowed feeds unchanged.
 */
export const useEventsCalendar = (scope: CalendarScope = {}) => {
  const initial = new Date();
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(localDateKey(initial));

  const computed = useMemo(() => {
    const firstCell = monthCells(cursor.year, cursor.month)[0];
    const lastCell = monthCells(cursor.year, cursor.month).at(-1)!;
    // Compute [from, to) covering the padded grid (first/last may be prev/next month).
    const from = `${new Date(
      firstCell.date.getFullYear(),
      firstCell.date.getMonth(),
      firstCell.date.getDate(),
    ).toISOString().slice(0, 10)}T00:00:00Z`;
    const to = `${new Date(
      lastCell.date.getFullYear(),
      lastCell.date.getMonth(),
      lastCell.date.getDate() + 1,
    ).toISOString().slice(0, 10)}T00:00:00Z`;
    return { from, to };
  }, [cursor.year, cursor.month]);

  const isLocal = useUser().isLocal;
  const posts =
    scope.mine && isLocal
      ? useEvents().useEventsCalendarMyRange(computed)
      : scope.groupId
        ? useEvents().useEventsCalendarGroupRange(scope.groupId, computed)
        : useEvents().useEventsCalendarRange(computed);

  const byDay = useMemo(() => {
    const rows: PublicPost[] = posts.data ?? [];
    return groupPostsByDay(rows);
  }, [posts.data]);

  const cells = useMemo(
    () => monthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
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
    isFetchingNextPage: false, // no paging in range mode
    shiftMonth,
    goToday,
  };
};
