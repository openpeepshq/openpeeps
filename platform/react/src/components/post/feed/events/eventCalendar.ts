import type { PublicPost } from '@openpeepshq/common/types';

export type EventsAgendaWindow = 'upcoming' | 'past' | 'current';

export type MonthCell = {
  key: string;
  inMonth: boolean;
};

const MAX_SPAN_DAYS = 370;

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

/**
 * Local calendar days an agenda row occupies.
 * Agenda feeds return one occurrence per event, so a series shows on that
 * occurrence only.
 */
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

export const groupPostsByDay = (
  posts: PublicPost[],
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
  return map;
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
