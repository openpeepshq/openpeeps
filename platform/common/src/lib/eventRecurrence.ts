import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  getDay,
} from 'date-fns';
import type {
  Event,
  EventOccurrenceException,
  RecurrenceWeekday,
} from '../types';

export const OCCURRENCE_HORIZON_MS = 365 * 24 * 60 * 60 * 1000;

const WEEKDAY_INDEX: Record<RecurrenceWeekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const INDEX_WEEKDAY: RecurrenceWeekday[] = [
  'SU',
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
];

export type ExpandedOccurrence = {
  recurrenceId: string;
  start: string;
  end?: string;
  cancelled: boolean;
};

export const normalizeRecurrenceId = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
};

export const sameRecurrenceId = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  return normalizeRecurrenceId(a) === normalizeRecurrenceId(b);
};

export const isRecurringEvent = (event: Event): boolean => !!event.recurrence;

export const eventDurationMs = (event: Event): number | undefined => {
  if (!event.end) return undefined;
  const ms = new Date(event.end).getTime() - new Date(event.start).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
};

const toIso = (date: Date): string => date.toISOString();

const applyDuration = (
  start: Date,
  durationMs: number | undefined,
): string | undefined => {
  if (durationMs == null) return undefined;
  return toIso(new Date(start.getTime() + durationMs));
};

const exceptionById = (event: Event): Map<string, EventOccurrenceException> => {
  const map = new Map<string, EventOccurrenceException>();
  for (const exception of event.exceptions ?? []) {
    map.set(normalizeRecurrenceId(exception.recurrenceId), exception);
  }
  return map;
};

export const weekdayFromDate = (date: Date): RecurrenceWeekday =>
  INDEX_WEEKDAY[getDay(date)];

export const parseOccurrenceQuery = (
  value?: string | null,
): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const nextByFreq = (
  date: Date,
  freq: NonNullable<Event['recurrence']>['freq'],
  interval: number,
): Date => {
  if (freq === 'DAILY') return addDays(date, interval);
  if (freq === 'WEEKLY') return addWeeks(date, interval);
  return addMonths(date, interval);
};

const generateRawStarts = (event: Event, untilBound: Date): Date[] => {
  const recurrence = event.recurrence;
  const dtstart = new Date(event.start);
  if (!recurrence) {
    return [dtstart];
  }

  const interval = recurrence.interval ?? 1;
  const until = recurrence.until ? new Date(recurrence.until) : undefined;
  const hardStop = until && until < untilBound ? until : untilBound;
  const starts: Date[] = [];

  const pushIfValid = (date: Date) => {
    if (date.getTime() < dtstart.getTime()) return;
    if (date.getTime() > hardStop.getTime()) return;
    starts.push(date);
  };

  if (recurrence.freq === 'WEEKLY' && (recurrence.byDay?.length ?? 0) > 0) {
    const byDays = new Set(recurrence.byDay);
    let cursor = dtstart;
    while (cursor.getTime() <= hardStop.getTime()) {
      if (
        byDays.has(weekdayFromDate(cursor)) &&
        differenceInCalendarWeeks(cursor, dtstart) % interval === 0
      ) {
        pushIfValid(cursor);
      }
      if (recurrence.count && starts.length >= recurrence.count) break;
      cursor = addDays(cursor, 1);
    }
  } else {
    let cursor = dtstart;
    while (cursor.getTime() <= hardStop.getTime()) {
      pushIfValid(cursor);
      if (recurrence.count && starts.length >= recurrence.count) break;
      cursor = nextByFreq(cursor, recurrence.freq, interval);
    }
  }

  const unique = [
    ...new Map(starts.map((date) => [date.getTime(), date])).values(),
  ].sort((a, b) => a.getTime() - b.getTime());

  return recurrence.count ? unique.slice(0, recurrence.count) : unique;
};

const decorateOccurrence = (
  originalStart: Date,
  event: Event,
  exceptions: Map<string, EventOccurrenceException>,
  durationMs: number | undefined,
): ExpandedOccurrence => {
  const recurrenceId = toIso(originalStart);
  const exception = exceptions.get(recurrenceId);
  if (exception?.cancelled) {
    return {
      recurrenceId,
      start: exception.start ?? recurrenceId,
      end: exception.end ?? applyDuration(originalStart, durationMs),
      cancelled: true,
    };
  }
  if (exception?.start) {
    const start = new Date(exception.start);
    return {
      recurrenceId,
      start: toIso(start),
      end: exception.end ?? applyDuration(start, durationMs),
      cancelled: false,
    };
  }
  return {
    recurrenceId,
    start: recurrenceId,
    end: applyDuration(originalStart, durationMs),
    cancelled: false,
  };
};

export const expandEventOccurrences = (
  event: Event,
  window: { from: Date; to: Date },
): ExpandedOccurrence[] => {
  const durationMs = eventDurationMs(event);
  const exceptions = exceptionById(event);
  const rawStarts = generateRawStarts(event, window.to);
  return rawStarts
    .map((start) => decorateOccurrence(start, event, exceptions, durationMs))
    .filter((occurrence) => {
      const start = new Date(occurrence.start);
      const end = occurrence.end ? new Date(occurrence.end) : start;
      return end >= window.from && start <= window.to;
    });
};

export const occurrencesForIndex = (
  event: Event,
  now = new Date(),
): ExpandedOccurrence[] => {
  if (!event.recurrence) {
    return [
      {
        recurrenceId: normalizeRecurrenceId(event.start),
        start: normalizeRecurrenceId(event.start),
        end: event.end ? normalizeRecurrenceId(event.end) : undefined,
        cancelled: false,
      },
    ];
  }
  return expandEventOccurrences(event, {
    from: new Date(now.getTime() - OCCURRENCE_HORIZON_MS),
    to: new Date(now.getTime() + OCCURRENCE_HORIZON_MS),
  });
};

export const previewUpcomingOccurrences = (
  event: Event,
  count = 3,
  now = new Date(),
): ExpandedOccurrence[] =>
  expandEventOccurrences(event, {
    from: now,
    to: new Date(now.getTime() + OCCURRENCE_HORIZON_MS),
  })
    .filter((occurrence) => !occurrence.cancelled)
    .slice(0, count);

export const effectiveEventTimes = (
  event: Event,
  recurrenceId?: string,
): { start: string; end?: string } => {
  if (!recurrenceId) {
    return { start: event.start, end: event.end };
  }
  const window = {
    from: new Date(new Date(recurrenceId).getTime() - OCCURRENCE_HORIZON_MS),
    to: new Date(new Date(recurrenceId).getTime() + OCCURRENCE_HORIZON_MS),
  };
  const match = expandEventOccurrences(event, window).find((occurrence) =>
    sameRecurrenceId(occurrence.recurrenceId, recurrenceId),
  );
  if (!match || match.cancelled) {
    return { start: event.start, end: event.end };
  }
  return { start: match.start, end: match.end };
};

export const upsertEventException = (
  event: Event,
  exception: EventOccurrenceException,
): Event => {
  const recurrenceId = normalizeRecurrenceId(exception.recurrenceId);
  const rest = (event.exceptions ?? []).filter(
    (existing) => !sameRecurrenceId(existing.recurrenceId, recurrenceId),
  );
  return {
    ...event,
    exceptions: [...rest, { ...exception, recurrenceId }],
  };
};
