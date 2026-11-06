import ical, {
  ICalCalendarMethod,
  ICalEventRepeatingFreq,
  ICalWeekday,
} from 'ical-generator';
import { TZDate } from '@date-fns/tz';
import { tzlib_get_ical_block } from 'timezones-ical-library';
import type { Event, PublicPost, RecurrenceWeekday } from '../types';
import { effectiveEventTimes } from './eventRecurrence';
import { getJamUrl } from './jamHelpers';
import { isIanaTimeZone } from './timeZone';

const utcDateFromYmd = (yyyyMmDd: string): Date => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const exclusiveEndAfterInclusiveDay = (yyyyMmDd: string): Date => {
  const dt = utcDateFromYmd(yyyyMmDd);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt;
};

/**
 * The event's stored IANA zone when it is one; ical-generator writes any
 * `timezone` string verbatim into `TZID=`, so non-IANA values fall back to
 * UTC output here.
 */
const eventTimeZone = (event: Event): string | undefined =>
  isIanaTimeZone(event.timeZone) ? event.timeZone : undefined;

/**
 * A zone-aware Date: ical-generator formats a TZDate's wall-clock components
 * in the event's zone, so the host's local zone (and its DST gaps) never
 * shifts the exported time.
 */
const instantInZone = (iso: string, timeZone?: string): Date =>
  timeZone ? new TZDate(iso, timeZone) : new Date(iso);

/** The default 1-hour end keeps the event's zone (or UTC). */
const defaultEnd = (start: Date, timeZone?: string): Date =>
  timeZone
    ? new TZDate(start.getTime() + 60 * 60 * 1000, timeZone)
    : new Date(start.getTime() + 60 * 60 * 1000);

/**
 * RFC 5545 requires a VTIMEZONE for every TZID used. ical-generator only
 * emits one via a calendar-level timezone, which in v10 also re-zones
 * UNTIL and DTSTAMP (both of which must stay UTC), so the component is
 * spliced in before the first VEVENT instead.
 */
const withVtimezone = (calendarText: string, timeZone: string): string => {
  const [block] = tzlib_get_ical_block(timeZone) as [string, string];
  const normalized = block.replace(/\r?\n/g, '\r\n').trim() + '\r\n';
  const veventIndex = calendarText.indexOf('BEGIN:VEVENT');
  return (
    calendarText.slice(0, veventIndex) +
    normalized +
    calendarText.slice(veventIndex)
  );
};

const originFromUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

/** Prefer a joinable place: physical address, jam URL, then external event URL. */
const eventLocation = (
  post: PublicPost,
  event: Event,
  postUrl?: string,
): string | undefined => {
  const physical = event.physicalLocation?.text?.trim();
  if (physical) {
    return physical;
  }
  if (event.jam) {
    const jamUrl = getJamUrl(post.id, originFromUrl(postUrl));
    if (jamUrl.startsWith('http')) {
      return jamUrl;
    }
  }
  return event.url?.trim() || undefined;
};

const repeatingFreq: Record<
  NonNullable<Event['recurrence']>['freq'],
  ICalEventRepeatingFreq
> = {
  DAILY: ICalEventRepeatingFreq.DAILY,
  WEEKLY: ICalEventRepeatingFreq.WEEKLY,
  MONTHLY: ICalEventRepeatingFreq.MONTHLY,
};

const repeatingWeekday: Record<RecurrenceWeekday, ICalWeekday> = {
  MO: ICalWeekday.MO,
  TU: ICalWeekday.TU,
  WE: ICalWeekday.WE,
  TH: ICalWeekday.TH,
  FR: ICalWeekday.FR,
  SA: ICalWeekday.SA,
  SU: ICalWeekday.SU,
};

const repeatingOptions = (event: Event, timeZone?: string) => {
  const recurrence = event.recurrence;
  if (!recurrence) return undefined;
  const exclude = (event.exceptions ?? [])
    .filter((exception) => exception.cancelled)
    .map((exception) => instantInZone(exception.recurrenceId, timeZone));
  return {
    freq: repeatingFreq[recurrence.freq],
    interval: recurrence.interval ?? 1,
    ...(recurrence.byDay?.length
      ? { byDay: recurrence.byDay.map((day) => repeatingWeekday[day]) }
      : {}),
    ...(recurrence.until ? { until: new Date(recurrence.until) } : {}),
    ...(recurrence.count ? { count: recurrence.count } : {}),
    ...(exclude.length ? { exclude } : {}),
  };
};

export const buildEventIcs = (
  post: PublicPost,
  options?: { postUrl?: string },
): string | null => {
  if (post.type !== 'event' || post.data?.type !== 'event') {
    return null;
  }

  const event = post.data as Event;
  const calendar = ical({
    prodId: '//OpenPeeps//Event//EN',
    method: ICalCalendarMethod.PUBLISH,
    scale: 'GREGORIAN',
  });

  const link = event.url ?? options?.postUrl;
  const summary = event.name?.trim() || 'Event';
  const description = event.content?.trim();
  const location = eventLocation(post, event, options?.postUrl);
  // Timed events keep the event's own zone; all-day events use DATE values
  // and carry no zone.
  const timeZone = event.wholeDay ? undefined : eventTimeZone(event);
  const repeating = repeatingOptions(event, timeZone);

  if (event.wholeDay) {
    const startYmd = event.start.slice(0, 10);
    const lastInclusiveYmd = event.end?.slice(0, 10) ?? startYmd;
    calendar.createEvent({
      id: `openpeeps-event-${post.id}@openpeepshq`,
      allDay: true,
      start: utcDateFromYmd(startYmd),
      end: exclusiveEndAfterInclusiveDay(lastInclusiveYmd),
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      ...(link ? { url: link } : {}),
      ...(repeating ? { repeating } : {}),
    });
  } else {
    const start = instantInZone(event.start, timeZone);
    const end = event.end
      ? instantInZone(event.end, timeZone)
      : defaultEnd(start, timeZone);
    calendar.createEvent({
      id: `openpeeps-event-${post.id}@openpeepshq`,
      start,
      end,
      ...(timeZone ? { timezone: timeZone } : {}),
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      ...(link ? { url: link } : {}),
      ...(repeating ? { repeating } : {}),
    });
  }

  for (const exception of event.exceptions ?? []) {
    if (exception.cancelled || !exception.start) continue;
    const start = instantInZone(exception.start, timeZone);
    const end = exception.end
      ? instantInZone(exception.end, timeZone)
      : defaultEnd(start, timeZone);
    calendar.createEvent({
      id: `openpeeps-event-${post.id}-${exception.recurrenceId}@openpeepshq`,
      start,
      end,
      ...(timeZone ? { timezone: timeZone } : {}),
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      ...(link ? { url: link } : {}),
      recurrenceId: instantInZone(exception.recurrenceId, timeZone),
    });
  }

  const calendarText = calendar.toString();
  return (
    (timeZone ? withVtimezone(calendarText, timeZone) : calendarText) + '\r\n'
  );
};

const addOccurrenceEvent = (
  calendar: ReturnType<typeof ical>,
  post: PublicPost,
  event: Event,
  recurrenceId: string,
  options?: { postUrl?: string },
) => {
  const link = event.url ?? options?.postUrl;
  const summary = event.name?.trim() || 'Event';
  const description = event.content?.trim();
  const location = eventLocation(post, event, options?.postUrl);
  const times = effectiveEventTimes(event, recurrenceId);
  const id = `openpeeps-event-${post.id}-${recurrenceId}@openpeepshq`;
  const timeZone = event.wholeDay ? undefined : eventTimeZone(event);

  if (event.wholeDay) {
    const startYmd = times.start.slice(0, 10);
    const lastInclusiveYmd = times.end?.slice(0, 10) ?? startYmd;
    calendar.createEvent({
      id,
      allDay: true,
      start: utcDateFromYmd(startYmd),
      end: exclusiveEndAfterInclusiveDay(lastInclusiveYmd),
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      ...(link ? { url: link } : {}),
    });
    return;
  }

  const start = instantInZone(times.start, timeZone);
  const end = times.end
    ? instantInZone(times.end, timeZone)
    : defaultEnd(start, timeZone);
  calendar.createEvent({
    id,
    start,
    end,
    ...(timeZone ? { timezone: timeZone } : {}),
    summary,
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    ...(link ? { url: link } : {}),
  });
};

/** Attendance ICS: discrete booked dates, or the series definition when none. */
export const buildRsvpIcs = (
  post: PublicPost,
  options?: { postUrl?: string; occurrenceIds?: string[] },
): string | null => {
  const occurrenceIds = options?.occurrenceIds?.filter(Boolean) ?? [];
  if (!occurrenceIds.length) {
    return buildEventIcs(post, { postUrl: options?.postUrl });
  }
  if (post.type !== 'event' || post.data?.type !== 'event') {
    return null;
  }

  const event = post.data as Event;
  const calendar = ical({
    prodId: '//OpenPeeps//Event//EN',
    method: ICalCalendarMethod.PUBLISH,
    scale: 'GREGORIAN',
  });

  for (const recurrenceId of occurrenceIds) {
    addOccurrenceEvent(calendar, post, event, recurrenceId, options);
  }

  const timeZone = event.wholeDay ? undefined : eventTimeZone(event);
  const calendarText = calendar.toString();
  return (
    (timeZone ? withVtimezone(calendarText, timeZone) : calendarText) + '\r\n'
  );
};

export const rsvpConfirmationContent = (
  post: PublicPost,
  options: { postUrl: string; occurrenceIds?: string[] },
): {
  ics: string;
  eventName: string;
  start: string;
  end: string | null;
  location: string | null;
  allDay: boolean;
  occurrenceCount: number;
} | null => {
  if (post.type !== 'event' || post.data?.type !== 'event') {
    return null;
  }
  const ics = buildRsvpIcs(post, options);
  if (!ics) return null;
  const event = post.data as Event;
  const occurrenceIds = options.occurrenceIds?.filter(Boolean) ?? [];
  const times =
    occurrenceIds.length > 0
      ? effectiveEventTimes(event, occurrenceIds[0])
      : { start: event.start, end: event.end };
  return {
    ics,
    eventName: event.name?.trim() || 'Event',
    start: times.start,
    end: times.end ?? null,
    location: event.physicalLocation?.text ?? null,
    allDay: event.wholeDay ?? false,
    occurrenceCount: occurrenceIds.length,
  };
};
