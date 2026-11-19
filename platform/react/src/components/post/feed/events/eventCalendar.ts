import {
  occurrencesForIndex,
  type ExpandedOccurrence,
} from '@openpeepshq/common/lib';
import type { PublicPost } from '@openpeepshq/common/types';

export type EventsAgendaWindow = 'upcoming' | 'past' | 'current';

/** Minimal occurrence shape the window predicate needs. */
export type AgendaWindowOccurrence = { start: string; end?: string };

export type MonthCell = {
  key: string;
  inMonth: boolean;
};

const MAX_SPAN_DAYS = 370;
/**
 * Mirrors the server predicate in `platform/core/src/posts/eventAgenda.ts`
 * (`occurrenceTimeFilter`: `COALESCE(end, start + interval '1 hour')`). If the
 * server duration changes, update both sides together.
 */
const IMPLIED_EVENT_DURATION_MS = 60 * 60 * 1000;

export const localDateKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

export const dateFromDayKey = (key: string): Date =>
  new Date(
    Number(key.slice(0, 4)),
    Number(key.slice(5, 7)) - 1,
    Number(key.slice(8, 10)),
  );

/** Scope the calendar reads: own events, a group's events, or the community feed. */
export type CalendarScopeProps = {
  /** Show only events owned by or RSVPe'd by local profile. */
  mine?: boolean;
  /** Group ID — fetch the group-scoped calendar. */
  groupId?: string;
  /**
   * The agenda tab the calendar belongs to. The range feed returns every
   * occurrence overlapping the visible month regardless of that relation to
   * now, so the tab's window is re-applied to the rows client-side (see
   * `calendarRowInWindow`) — without it the Upcoming tab renders past events
   * as soon as the user navigates the grid to a previous month.
   */
  window?: EventsAgendaWindow;
};

/**
 * Local-midnight bounds of the padded month grid. The instants are built from
 * local day bounds so the [from, to) window covers every local day the grid
 * shows, whatever UTC offset the browser sits in.
 */
export const monthWindow = (
  year: number,
  month: number,
): { from: string; to: string } => {
  const cells = monthCells(year, month);
  const first = dateFromDayKey(cells[0]!.key);
  const last = dateFromDayKey(cells[cells.length - 1]!.key);
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const to = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const startOfMonth = (year: number, month: number): Date =>
  new Date(year, month, 1);

export const endOfMonth = (year: number, month: number): Date =>
  new Date(year, month + 1, 0, 23, 59, 59, 999);

/** Sunday-first weeks for `month` (0-indexed). Drops a trailing out-of-month week. */
export const monthCells = (year: number, month: number): MonthCell[] => {
  const first = new Date(year, month, 1);
  const cursor = addDays(first, -first.getDay());
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(cursor, i);
    cells.push({
      key: localDateKey(date),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
    });
  }
  let count = cells.length;
  while (
    count > 7 &&
    cells.slice(count - 7, count).every((cell) => !cell.inMonth)
  ) {
    count -= 7;
  }
  return cells.slice(0, count);
};

const ymdToLocal = (ymd: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const keysBetween = (start: Date, end: Date): string[] => {
  const last = end.getTime() < start.getTime() ? start : end;
  const keys: string[] = [];
  for (
    let cursor = start;
    cursor.getTime() <= last.getTime() && keys.length < MAX_SPAN_DAYS;
    cursor = addDays(cursor, 1)
  ) {
    keys.push(localDateKey(cursor));
  }
  return keys;
};

export const eventStartIso = (post: PublicPost): string | undefined => {
  if (post.data.type !== 'event') return undefined;
  return post.occurrenceStart ?? post.data.start;
};

export const eventEndIso = (post: PublicPost): string | undefined => {
  if (post.data.type !== 'event') return undefined;
  return post.occurrenceEnd ?? post.data.end;
};

/** Local calendar days one occurrence occupies. */
export const eventDayKeys = (post: PublicPost): string[] => {
  if (post.data.type !== 'event') return [];
  const startIso = eventStartIso(post);
  if (!startIso) return [];
  const endIso = eventEndIso(post);

  if (post.data.wholeDay) {
    const start = ymdToLocal(startIso);
    if (!start) return [];
    const end = ymdToLocal(endIso ?? startIso) ?? start;
    return keysBetween(start, end);
  }

  const startInstant = new Date(startIso);
  if (Number.isNaN(startInstant.getTime())) return [];
  const endInstant = endIso ? new Date(endIso) : startInstant;
  const end = Number.isNaN(endInstant.getTime()) ? startInstant : endInstant;
  const startDay = new Date(
    startInstant.getFullYear(),
    startInstant.getMonth(),
    startInstant.getDate(),
  );
  let endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const endsAtMidnight =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getMilliseconds() === 0;
  if (endsAtMidnight && endDay.getTime() > startDay.getTime()) {
    endDay = addDays(endDay, -1);
  }
  return keysBetween(startDay, endDay);
};

export const uniquePosts = (
  pages: PublicPost[][] | undefined,
): PublicPost[] => {
  const seen = new Set<string>();
  const out: PublicPost[] = [];
  for (const post of pages?.flat() ?? []) {
    const key = `${post.id}:${post.occurrenceRecurrenceId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
  }
  return out;
};

/**
 * The window predicate compares instants, but the calendar grid buckets
 * whole-day events by their local calendar day (`eventDayKeys` →
 * `ymdToLocal`). Comparing a whole-day row's UTC-midnight stored instant
 * against `now` can disagree with the local day the grid actually shows for
 * communities far from UTC (a whole-day event that has not begun locally yet
 * would look started-and-ended, or vice versa). Normalizing whole-day
 * occurrences to their local-day midnight for the window comparison keeps
 * the predicate aligned with what the grid displays.
 *
 * Known limitation: `ymdToLocal` uses the community timezone (server config),
 * not the viewer's — the whole-day path inherits the same timezone
 * assumption as the grid and the server-side calendar-day calculation, so a
 * viewer far outside the community timezone can still see the window and the
 * grid disagree.
 */
const wholeDayWindowInstant = (
  ymd: string,
  dayOffset = 0,
): number | undefined => {
  const local = ymdToLocal(ymd);
  if (!local) return undefined;
  const day = addDays(local, dayOffset);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
};

const occurrenceMatchesAgenda = (
  occurrence: AgendaWindowOccurrence,
  window: EventsAgendaWindow,
  now: Date,
  wholeDay = false,
): boolean => {
  const startMs = wholeDay
    ? wholeDayWindowInstant(occurrence.start)
    : new Date(occurrence.start).getTime();
  if (startMs === undefined || !Number.isFinite(startMs)) return false;
  // A whole-day event occupies each local day it covers (the same day range
  // `eventDayKeys` renders), so its window end is the midnight that starts
  // the day after its last day — not the timed events' one-hour implied end.
  const explicitEndMs = occurrence.end
    ? wholeDay
      ? wholeDayWindowInstant(occurrence.end, 1)
      : new Date(occurrence.end).getTime()
    : Number.NaN;
  const impliedEndMs = wholeDay
    ? startMs + 24 * 60 * 60 * 1000
    : startMs + IMPLIED_EVENT_DURATION_MS;
  const endMs =
    Number.isFinite(explicitEndMs) && explicitEndMs !== undefined
      ? explicitEndMs
      : impliedEndMs;
  const nowMs = now.getTime();
  if (window === 'past') return endMs < nowMs;
  if (window === 'current') return startMs <= nowMs && endMs >= nowMs;
  // Upcoming mirrors the server predicate COALESCE(end, start + 1h) >= now,
  // so a started event without an explicit end stays until its implied
  // one-hour mark passes.
  return startMs > nowMs || endMs >= nowMs;
};

/**
 * Memoized occurrence expansion for the window guard. It runs inside a
 * TanStack `select` on every data change or periodic refetch, and a series
 * row's occurrences do not depend on which row they come from — but they do
 * depend on `now`, so the cache is keyed per post and validated per tick.
 */
const occurrenceCache = new WeakMap<
  PublicPost,
  { now: number; occurrences: ExpandedOccurrence[] }
>();

const cachedOccurrences = (
  post: PublicPost,
  now: Date,
): ExpandedOccurrence[] => {
  const nowMs = now.getTime();
  const cached = occurrenceCache.get(post);
  if (cached && cached.now === nowMs) return cached.occurrences;
  const data = post.data;
  const occurrences =
    data.type === 'event' && data.recurrence
      ? occurrencesForIndex(data, now)
      : [];
  occurrenceCache.set(post, { now: nowMs, occurrences });
  return occurrences;
};

const postForOccurrence = (
  post: PublicPost,
  occurrence: ExpandedOccurrence,
): PublicPost => {
  const { occurrenceEnd: _previousEnd, ...rest } = post;
  return {
    ...rest,
    occurrenceRecurrenceId: occurrence.recurrenceId,
    occurrenceStart: occurrence.start,
    ...(occurrence.end ? { occurrenceEnd: occurrence.end } : {}),
  };
};

/**
 * Agenda feeds return one row per series. Place every occurrence that belongs
 * in this window on its own date. Paging still uses the original rows.
 *
 * Callers pass agenda feeds, whose SQL filters `posts.type = 'event'`;
 * non-event rows are dropped here so a future mixed-feed caller is not
 * silently exposed to unfiltered rows.
 *
 * Non-recurring events are filtered against the agenda window so that the
 * Upcoming tab never displays events that have already ended (client-side
 * guard against server-side staleness).  A recurring series whose
 * in-window occurrences are all past is dropped entirely instead of falling
 * back to the original past-dated row.
 */
export const expandRecurringAgendaPosts = (
  posts: PublicPost[],
  window: EventsAgendaWindow,
  now = new Date(),
): PublicPost[] => {
  const rows = posts.flatMap((post) => {
    if (post.data.type !== 'event') return [];

    if (post.data.recurrence) {
      const occurrences = occurrencesForIndex(post.data, now).filter(
        (occurrence) =>
          !occurrence.cancelled &&
          occurrenceMatchesAgenda(
            occurrence,
            window,
            now,
            post.data.type === 'event' && post.data.wholeDay,
          ),
      );
      return occurrences.map((occurrence) =>
        postForOccurrence(post, occurrence),
      );
    }

    // Non-recurring one-off event: keep only if it matches the window.
    const startIso = eventStartIso(post);
    const endIso = eventEndIso(post);
    if (!startIso) return [];
    const occurrence: AgendaWindowOccurrence = {
      start: startIso,
      ...(endIso ? { end: endIso } : {}),
    };
    return occurrenceMatchesAgenda(occurrence, window, now, post.data.wholeDay)
      ? [post]
      : [];
  });
  return uniquePosts([rows]);
};

const rowMatchesAgenda = (
  post: PublicPost,
  window: EventsAgendaWindow,
  now: Date,
): boolean => {
  if (post.data.type !== 'event') return false;
  if (post.data.recurrence) {
    return cachedOccurrences(post, now).some(
      (occurrence) =>
        !occurrence.cancelled &&
        occurrenceMatchesAgenda(
          occurrence,
          window,
          now,
          post.data.type === 'event' && post.data.wholeDay,
        ),
    );
  }
  const startIso = eventStartIso(post);
  if (!startIso) return false;
  const endIso = eventEndIso(post);
  return occurrenceMatchesAgenda(
    { start: startIso, ...(endIso ? { end: endIso } : {}) },
    window,
    now,
    post.data.type === 'event' && post.data.wholeDay,
  );
};

/**
 * Series-level window guard for the agenda *list* (as opposed to
 * `expandRecurringAgendaPosts`, which expands occurrences for the calendar).
 * The list shows one card per series exactly as the server returns them, so
 * a recurring series is kept when any non-cancelled occurrence matches the
 * window and its row keeps the series' own stored times. Same predicate as
 * the calendar guard, so server-side staleness (stale occurrence index,
 * older deployed server) cannot surface a past event on the Upcoming list
 * either.
 *
 * Cost: O(occurrences × rows) per run. The server already filters by
 * window, so this guard is a safety net against staleness; its callers
 * (the TanStack `select` in `AGENDA_SELECTS`, memoized on `data`) do not
 * run it per render, only on a data change or the periodic refetch. A
 * series' occurrence expansion is computed once per predicate run for that
 * series — its result drives every occurrence check — so the worst case is
 * one expansion per series row, not one per candidate occurrence.
 */
export const applyAgendaWindowFilter = (
  posts: PublicPost[],
  window: EventsAgendaWindow,
  now = new Date(),
): PublicPost[] => posts.filter((post) => rowMatchesAgenda(post, window, now));

/**
 * Per-occurrence window guard for the date-range calendar (issue #2131).
 * The range feed returns one row per occurrence that overlaps the visible
 * month, with the occurrence's own times on `occurrenceStart` /
 * `occurrenceEnd` — so the predicate must judge the *row's* occurrence, not
 * the whole series (`rowMatchesAgenda` would keep an old occurrence of a
 * series that still has an in-window occurrence). Without this guard the
 * Upcoming tab renders past events once the grid navigates to a previous
 * month. Same window semantics as `occurrenceMatchesAgenda` (and the
 * server's `occurrenceTimeFilter`), including the one-hour implied end and
 * the whole-day local-midnight alignment.
 */
export const calendarRowInWindow = (
  post: PublicPost,
  window: EventsAgendaWindow,
  now = new Date(),
): boolean => {
  if (post.data.type !== 'event') return false;
  const startIso = eventStartIso(post);
  if (!startIso) return false;
  const endIso = eventEndIso(post);
  return occurrenceMatchesAgenda(
    { start: startIso, ...(endIso ? { end: endIso } : {}) },
    window,
    now,
    post.data.wholeDay,
  );
};

/** Drop day buckets outside the rendered window — overflow rows may extend past it. */
const filterBucketsToWindow = (
  map: Map<string, PublicPost[]>,
  window: { from: string; to: string },
): Map<string, PublicPost[]> => {
  const from = new Date(window.from).getTime();
  const to = new Date(window.to).getTime();
  const filtered = new Map<string, PublicPost[]>();
  for (const [key, bucket] of map) {
    const day = dateFromDayKey(key).getTime();
    if (day >= from && day < to) filtered.set(key, bucket);
  }
  return filtered;
};

export const groupPostsByDay = (
  posts: PublicPost[],
  window?: { from: string; to: string },
): Map<string, PublicPost[]> => {
  const map = new Map<string, PublicPost[]>();
  for (const post of posts) {
    for (const key of eventDayKeys(post)) {
      const bucket = map.get(key);
      if (bucket) bucket.push(post);
      else map.set(key, [post]);
    }
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) =>
      (eventStartIso(a) ?? '').localeCompare(eventStartIso(b) ?? ''),
    );
  }
  return window ? filterBucketsToWindow(map, window) : map;
};

const validStarts = (starts: Array<string | undefined>): Date[] =>
  starts
    .map((start) => (start ? new Date(start) : undefined))
    .filter((date): date is Date => !!date && !Number.isNaN(date.getTime()));

/**
 * Upcoming pages are oldest-first and past pages are newest-first. Stop once
 * the loaded edge has moved past the visible month.
 */
export const agendaCoversRange = (
  starts: Array<string | undefined>,
  rangeStart: Date,
  rangeEnd: Date,
  direction: 'forward' | 'backward',
): boolean => {
  const parsed = validStarts(starts);
  if (parsed.length === 0) return false;
  if (direction === 'forward') {
    const latest = parsed.reduce((a, b) => (a > b ? a : b));
    return latest.getTime() > rangeEnd.getTime();
  }
  const earliest = parsed.reduce((a, b) => (a < b ? a : b));
  return earliest.getTime() < rangeStart.getTime();
};

export const MAX_CALENDAR_PAGES = 30;

export const shouldFetchMoreAgenda = ({
  window,
  starts,
  rangeStart,
  rangeEnd,
  hasNextPage,
  pagesLoaded,
}: {
  window: EventsAgendaWindow;
  starts: Array<string | undefined>;
  rangeStart: Date;
  rangeEnd: Date;
  hasNextPage: boolean;
  pagesLoaded: number;
}): boolean => {
  if (!hasNextPage || pagesLoaded >= MAX_CALENDAR_PAGES) return false;
  if (window === 'current') return true;
  return !agendaCoversRange(
    starts,
    rangeStart,
    rangeEnd,
    window === 'past' ? 'backward' : 'forward',
  );
};
