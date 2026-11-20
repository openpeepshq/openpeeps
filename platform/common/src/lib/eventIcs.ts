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

/**
 * Feed cache TTL in seconds. Single source of truth for the HTTP `max-age`
 * and the ICS `REFRESH-INTERVAL`/`X-PUBLISHED-TTL` so they cannot drift.
 */
export const EVENTS_ICS_FEED_TTL_SECONDS = 3600;

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

/**
 * ical-generator writes an all-day `recurrenceId` as a UTC instant
 * (`RECURRENCE-ID:20260713T000000Z`), but RFC 5545 §3.8.4.4 requires the
 * RECURRENCE-ID value type to match the series DTSTART — DATE for all-day
 * events. Rewrite each RECURRENCE-ID line to DATE form.
 */
const withDateRecurrenceId = (calendarText: string): string =>
  // Split on any line ending so a trailing `\r` is never carried into the
  // re-joined CRLF text (splitting on `\n` alone would leave `\r\r\n`).
  calendarText
    .split(/\r\n|\r|\n/)
    .map((line) => {
      if (!line.startsWith('RECURRENCE-ID')) return line;
      if (line.includes(';VALUE=DATE')) return line;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return line;
      const ymd = line
        .slice(colonIdx + 1)
        .replace(/[^0-9]/g, '')
        .slice(0, 8);
      return `RECURRENCE-ID;VALUE=DATE:${ymd}`;
    })
    .join('\r\n');

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
  post: IcsEventPost,
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

/**
 * Minimal structural shape of an event post that the feed builder reads.
 * `PostWithMeta` satisfies it, so callers can pass rich post objects
 * without a cast.
 */
export type IcsEventPost = {
  id: string;
  type: string;
  data?: { type?: string } & Record<string, unknown>;
  updatedAt: string;
};
export const buildEventIcs = (
  post: IcsEventPost,
  options?: { postUrl?: string; lastModified?: string; sequence?: number },
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

  // Optional per-post edit stamp (used by the feed so clients update an
  // existing UID instead of re-adding); omitted for single-event exports.
  const stamp = options?.lastModified
    ? {
        lastModified: new Date(options.lastModified),
        sequence: options.sequence ?? 0,
      }
    : {};

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
      ...stamp,
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
      ...stamp,
      ...(repeating ? { repeating } : {}),
    });
  }

  for (const exception of event.exceptions ?? []) {
    if (exception.cancelled || !exception.start) continue;
    if (event.wholeDay) {
      // Rescheduled all-day occurrence: an all-day override whose day range
      // is the exception's new start day through its end day (inclusive).
      // RECURRENCE-ID identifies the *original* occurrence (RFC 5545 3.8.4.4),
      // while DTSTART/DTEND stay on the new days. The DATE-form RECURRENCE-ID
      // is normalized after serialization.
      const excStartYmd = exception.start.slice(0, 10);
      const excLastInclusiveYmd = exception.end?.slice(0, 10) ?? excStartYmd;
      calendar.createEvent({
        id: `openpeeps-event-${post.id}-${exception.recurrenceId}@openpeepshq`,
        allDay: true,
        start: utcDateFromYmd(excStartYmd),
        end: exclusiveEndAfterInclusiveDay(excLastInclusiveYmd),
        summary,
        ...(description ? { description } : {}),
        ...(location ? { location } : {}),
        ...(link ? { url: link } : {}),
        ...stamp,
        recurrenceId: utcDateFromYmd(exception.recurrenceId.slice(0, 10)),
      });
    } else {
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
        ...stamp,
        recurrenceId: instantInZone(exception.recurrenceId, timeZone),
      });
    }
  }

  const calendarText = calendar.toString();
  const processed = event.wholeDay
    ? withDateRecurrenceId(calendarText)
    : calendarText;
  return (timeZone ? withVtimezone(processed, timeZone) : processed) + '\r\n';
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

/** Collect the VEVENT blocks from a full ICS document. */
const extractVevents = (ics: string): string[] => {
  const blocks: string[] = [];
  let depth = 0;
  let current: string[] = [];
  for (const line of ics.split(/\r?\n/)) {
    if (line.startsWith('BEGIN:VEVENT')) {
      depth += 1;
      current = [line];
    } else if (line.startsWith('END:VEVENT')) {
      depth -= 1;
      current.push(line);
      if (depth === 0) blocks.push(current.join('\r\n'));
    } else if (depth > 0) {
      current.push(line);
    }
  }
  return blocks;
};

/**
 * The zone list referenced by a set of VEVENTs, in first-seen order. Each
 * per-post export splices in the VTIMEZONEs its events use; a feed of several
 * zone-aware events must keep one block per zone (ical-generator emits
 * `TZID=` references without any VTIMEZONE of its own).
 */
const referencedZones = (vevents: string[]): string[] => {
  const zones: string[] = [];
  for (const vevent of vevents) {
    for (const line of vevent.split('\r\n')) {
      const match = line.match(/;TZID=([^:;]+)/);
      if (match && !zones.includes(match[1])) {
        zones.push(match[1]);
      }
    }
  }
  return zones;
};

/**
 * Build a multi-event ICS feed string. Composes the single-event exports so
 * the feed stays byte-identical to what the per-event download produces, and
 * carries one deduped VTIMEZONE block per zone so zone-aware events survive.
 *
 * `postUrl` is the community base (origin); each event's joinable-URL fallback
 * is derived as `${postUrl}/posts/{id}`, mirroring the single-event export.
 * Passing a bare origin (never the request URL) keeps the feed's `?token=`
 * secret out of the ICS body.
 *
 * With no events the feed is still a valid calendar (PRODID, `X-WR-CALNAME`,
 * `REFRESH-INTERVAL`, `X-PUBLISHED-TTL`, no VEVENTs) — the same shape the
 * feed endpoint's 401 `emptyCalendar` fallback mirrors. An empty feed is 200,
 * not 404: calendar clients expect a parseable document they can re-poll.
 */
export const buildEventsFeedIcs = (
  posts: IcsEventPost[],
  options: { postUrl?: string; name: string; ttl?: number },
): string => {
  const { name, ttl = EVENTS_ICS_FEED_TTL_SECONDS } = options;
  const calendar = ical({
    prodId: '//OpenPeeps//Feed//EN',
    method: ICalCalendarMethod.PUBLISH,
    scale: 'GREGORIAN',
    name,
    ttl,
  });

  const base = options.postUrl?.replace(/\/+$/, '');
  const vevents: string[] = [];
  for (const post of posts) {
    if (post.type !== 'event' || post.data?.type !== 'event') continue;
    const single = buildEventIcs(post, {
      postUrl: base ? `${base}/posts/${post.id}` : undefined,
      lastModified: post.updatedAt,
      // Minutes since epoch: stable across processes, grows only on edits.
      sequence: Math.floor(new Date(post.updatedAt).getTime() / 60000),
    });
    if (single) vevents.push(...extractVevents(single));
  }

  const zoneBlocks = referencedZones(vevents)
    .map((zone) => {
      const [block] = tzlib_get_ical_block(zone) as [string, string];
      return block.replace(/\r?\n/g, '\r\n').trim();
    })
    .join('\r\n');

  const body =
    (zoneBlocks ? zoneBlocks + '\r\n' : '') +
    (vevents.length ? vevents.join('\r\n') + '\r\n' : '');
  return calendar
    .toString()
    .replace(/END:VCALENDAR\r?\n?$/, body + 'END:VCALENDAR\r\n');
};
