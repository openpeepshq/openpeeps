import { useEffect, useMemo, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common';
import {
  dateFromDayKey,
  groupPostsByDay,
  localDateKey,
  monthCells,
  monthWindow,
  uniquePosts,
  type CalendarScopeProps,
} from '../../components/post/feed/events/eventCalendar';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { CALENDAR_RANGE_LIMIT } from '../../contexts/openpeeps/hooks/posts';

export const eventName = (post: PublicPost): string =>
  post.data.type === 'event' ? post.data.name?.trim() || '-' : '-';

export const dayNumber = (key: string): string =>
  String(Number(key.slice(8, 10)));

/**
 * Date-centered events calendar hook. Computes a `[from, to)` window directly
 * from the rendered month grid, fetches one row per occurrence from the
 * date-range feed, then buckets the rows by browser-local day keys
 * (`YYYY-MM-DD`). The Upcoming/Current/Past lists keep the windowed feeds.
 */
export const useEventsCalendar = (scope: CalendarScopeProps = {}) => {
  const initial = new Date();
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(localDateKey(initial));

  const { openpeepsApi, client } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const mineEnabled = scope.mine === true && currentProfile?.type === 'local';

  const rangeWindow = useMemo(
    () => monthWindow(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  // All three reads stay mounted so hook order never changes with scope; the
  // enabled flags pick the one the scope asks for.
  const groupQuery = openpeepsApi.useEventsCalendarGroupRange(
    scope.groupId ?? '',
    rangeWindow,
    !mineEnabled && scope.groupId != null,
  );
  const myQuery = openpeepsApi.useEventsCalendarMyRange(
    rangeWindow,
    mineEnabled,
  );
  const feedQuery = openpeepsApi.useEventsCalendarRange(
    rangeWindow,
    !mineEnabled && scope.groupId == null,
  );
  const activeQuery = mineEnabled
    ? myQuery
    : scope.groupId != null
      ? groupQuery
      : feedQuery;

  // The range feed pages by offset once a page comes back full.
  const [overflowRows, setOverflowRows] = useState<PublicPost[]>([]);
  const [pagingMore, setPagingMore] = useState(false);

  // Reset paging state on window or scope change; without the scope keys a
  // same-month scope switch would keep the previous scope's overflow rows.
  useEffect(() => {
    setOverflowRows([]);
    setPagingMore(false);
  }, [rangeWindow.from, rangeWindow.to, mineEnabled, scope.groupId]);

  // The endpoint object is stable per client (built inside openpeepsClient);
  // select it on stable scope inputs so the paging effect below does not
  // re-trigger on every render.
  const rangeEndpoint = useMemo(
    () =>
      mineEnabled
        ? client.posts.feeds.events.my.range
        : scope.groupId != null
          ? client.posts.feeds.events.group.range
          : client.posts.feeds.events.range,
    [client, mineEnabled, scope.groupId],
  );
  const pageFull = (activeQuery.data?.length ?? 0) >= CALENDAR_RANGE_LIMIT;

  useEffect(() => {
    // Walk only when the first page filled and no overflow was fetched yet.
    // `overflowRows.length` is the wake-up dep: the reset effect above clears
    // it on window/scope changes, so a scope switch with a full new page
    // re-runs this effect after the reset, while unrelated re-renders (stable
    // endpoint, unchanged window, same length) never restart a finished walk.
    if (!pageFull) return;
    if (overflowRows.length > 0) return;
    let cancelled = false;
    setPagingMore(true);
    void (async () => {
      const rows: PublicPost[] = [];
      for (
        let offset = CALENDAR_RANGE_LIMIT;
        ;
        offset += CALENDAR_RANGE_LIMIT
      ) {
        const result = await rangeEndpoint({
          queryParameters: {
            from: rangeWindow.from,
            to: rangeWindow.to,
            limit: CALENDAR_RANGE_LIMIT,
            offset,
          },
        });
        if (cancelled) return;
        if ('error' in result) break;
        const page = result.data as PublicPost[];
        rows.push(...page);
        if (page.length < CALENDAR_RANGE_LIMIT) break;
      }
      if (!cancelled) {
        setOverflowRows(rows);
        setPagingMore(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    pageFull,
    rangeEndpoint,
    rangeWindow.from,
    rangeWindow.to,
    overflowRows.length,
  ]);

  const rows = useMemo(
    () => uniquePosts([activeQuery.data ?? [], overflowRows]),
    [activeQuery.data, overflowRows],
  );
  const byDay = useMemo(
    () => groupPostsByDay(rows, rangeWindow),
    [rows, rangeWindow],
  );
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
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Date(2026, 0, 4 + index).toLocaleDateString(undefined, {
          weekday: 'short',
        }),
      ),
    [],
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
    isLoading: activeQuery.isLoading,
    isFetchingNextPage: pagingMore || activeQuery.isFetching,
    shiftMonth,
    goToday,
  };
};
