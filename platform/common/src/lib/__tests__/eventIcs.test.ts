import { describe, it, expect } from 'vitest';
import type { PublicPost, PublicProfile } from '../../types';
import {
  buildEventIcs,
  buildEventsFeedIcs,
  buildRsvpIcs,
  rsvpConfirmationContent,
} from '../eventIcs';

// Pin a non-UTC host zone with DST so a regression to host-local wall-clock
// reconstruction would fail here (runtime TZ changes are honored by Node).
process.env.TZ = 'Europe/Berlin';

/** ICS folds long lines with CRLF + space; unwrap for assertions. */
const unfoldIcs = (ics: string): string => ics.replace(/\r?\n[ \t]/g, '');

const mockPublicProfile = {
  id: 'profile1',
  displayName: 'Test User',
} as PublicProfile;

const baseEventPost = {
  id: '019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7',
  type: 'event',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  inReplyToId: null,
  reactions: [],
  reposts: [],
  entries: [],
  rsvps: [],
  group: null,
  profile: mockPublicProfile,
  mentions: [],
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  tags: [],
} as unknown as PublicPost;

const timedEventFields = {
  type: 'event' as const,
  name: 'Testing with Trivia',
  content: 'Testing with Trivia',
  start: '2026-07-07T21:00:00.000Z',
  end: '2026-07-07T22:00:00.000Z',
  wholeDay: false,
};

describe('buildEventIcs', () => {
  it('returns null for non-event posts', () => {
    expect(
      buildEventIcs({
        ...baseEventPost,
        type: 'note',
        data: { type: 'note' },
      } as PublicPost),
    ).toBeNull();
  });

  it('uses jam URL as LOCATION when the event has a jam', () => {
    const ics = buildEventIcs(
      {
        ...baseEventPost,
        data: {
          ...timedEventFields,
          jam: {
            moderators: [],
            videoEnabled: true,
            type: 'video-call',
          },
        },
      } as PublicPost,
      {
        postUrl:
          'https://ba-dev.ap.social/posts/019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7',
      },
    );

    expect(unfoldIcs(ics!)).toContain(
      'LOCATION:https://ba-dev.ap.social/events/019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7/jam',
    );
  });

  it('prefers physical location over jam URL', () => {
    const ics = buildEventIcs(
      {
        ...baseEventPost,
        data: {
          ...timedEventFields,
          physicalLocation: { text: '123 Main St' },
          jam: {
            moderators: [],
            videoEnabled: true,
            type: 'video-call',
          },
        },
      } as PublicPost,
      { postUrl: 'https://example.com/posts/event1' },
    );

    expect(unfoldIcs(ics!)).toContain('LOCATION:123 Main St');
    expect(unfoldIcs(ics!)).not.toContain('/jam');
  });

  it('falls back to external event URL when there is no jam or place', () => {
    const ics = buildEventIcs(
      {
        ...baseEventPost,
        data: {
          ...timedEventFields,
          url: 'https://zoom.example/meeting',
        },
      } as PublicPost,
      { postUrl: 'https://example.com/posts/event1' },
    );

    expect(unfoldIcs(ics!)).toContain('LOCATION:https://zoom.example/meeting');
  });

  it('omits LOCATION when jam exists but postUrl origin is unavailable', () => {
    const ics = buildEventIcs({
      ...baseEventPost,
      data: {
        ...timedEventFields,
        jam: {
          moderators: [],
          videoEnabled: true,
          type: 'video-call',
        },
      },
    } as PublicPost);

    expect(ics).not.toMatch(/^LOCATION:/m);
  });

  it('preserves the event timezone via TZID for timed events', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          timeZone: 'America/Los_Angeles',
        },
      } as PublicPost)!,
    );
    // 21:00Z / 22:00Z = 14:00 / 15:00 in Los Angeles (PDT in July)
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260707T140000');
    expect(ics).toContain('DTEND;TZID=America/Los_Angeles:20260707T150000');
  });

  it('emits a VTIMEZONE component before the first VEVENT', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          timeZone: 'America/Los_Angeles',
        },
      } as PublicPost)!,
    );
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics).toContain('TZID:America/Los_Angeles');
    expect(ics).toContain('END:VTIMEZONE');
    expect(ics.indexOf('BEGIN:VTIMEZONE')).toBeLessThan(
      ics.indexOf('BEGIN:VEVENT'),
    );
  });

  it('exports the event wall time when the host zone has a DST gap that day', () => {
    // 02:30–03:30 EDT on 2026-03-29; 02:00–03:00 on that day does not exist
    // in Europe/Berlin, so a host-local reconstruction would shift it an hour.
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          start: '2026-03-29T06:30:00.000Z',
          end: '2026-03-29T07:30:00.000Z',
          timeZone: 'America/New_York',
        },
      } as PublicPost)!,
    );
    expect(ics).toContain('DTSTART;TZID=America/New_York:20260329T023000');
    expect(ics).toContain('DTEND;TZID=America/New_York:20260329T033000');
  });

  it('keeps the series wall time stable across a DST change', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          start: '2026-03-04T15:00:00.000Z',
          end: '2026-03-04T16:00:00.000Z',
          timeZone: 'America/New_York',
          recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
        },
      } as PublicPost)!,
    );
    // 15:00Z = 10:00 EST; the series then crosses the 2026-03-08
    // spring-forward, and the calendar app expands it at the same 10:00 wall
    // time.
    expect(ics).toContain('DTSTART;TZID=America/New_York:20260304T100000');
    expect(ics).toContain('DTEND;TZID=America/New_York:20260304T110000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;COUNT=4;INTERVAL=1');
  });

  it('keeps UNTIL in UTC form while DTSTART carries the TZID', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          timeZone: 'America/Los_Angeles',
          recurrence: {
            freq: 'WEEKLY' as const,
            interval: 1,
            until: '2026-07-28T21:00:00.000Z',
          },
        },
      } as PublicPost)!,
    );
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260707T140000');
    expect(ics).toContain(
      'RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20260728T210000Z',
    );
  });

  it('emits EXDATE;TZID for cancelled occurrences of a zoned series', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          timeZone: 'America/Los_Angeles',
          recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
          exceptions: [
            { recurrenceId: '2026-07-14T21:00:00.000Z', cancelled: true },
          ],
        },
      } as PublicPost)!,
    );
    // 21:00Z = 14:00 PDT
    expect(ics).toContain('EXDATE;TZID=America/Los_Angeles:20260714T140000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
  });

  it('emits RECURRENCE-ID;TZID for a modified occurrence of a zoned series', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          timeZone: 'America/Los_Angeles',
          recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
          exceptions: [
            {
              recurrenceId: '2026-07-14T21:00:00.000Z',
              start: '2026-07-14T23:00:00.000Z',
              end: '2026-07-15T00:00:00.000Z',
            },
          ],
        },
      } as PublicPost)!,
    );
    // 21:00Z = 14:00 PDT (the original slot); moved to 23:00Z = 16:00 PDT.
    expect(ics).toContain(
      'RECURRENCE-ID;TZID=America/Los_Angeles:20260714T140000',
    );
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260714T160000');
    expect(ics).toContain('DTEND;TZID=America/Los_Angeles:20260714T170000');
  });

  it('keeps UTC times for timed events without a timezone', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: timedEventFields,
      } as PublicPost)!,
    );
    expect(ics).toContain('DTSTART:20260707T210000Z');
    expect(ics).not.toContain('TZID');
  });

  it('does not attach a timezone to all-day events', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          type: 'event' as const,
          name: 'All day',
          start: '2026-07-07T12:00:00.000Z',
          end: '2026-07-08T12:00:00.000Z',
          wholeDay: true,
          timeZone: 'America/Los_Angeles',
        },
      } as PublicPost)!,
    );
    expect(ics).toContain('DTSTART;VALUE=DATE:20260707');
    expect(ics).not.toContain('TZID');
  });

  it('preserves the event timezone in booked occurrence ICS', () => {
    const ics = unfoldIcs(
      buildRsvpIcs(
        {
          ...baseEventPost,
          data: {
            ...timedEventFields,
            timeZone: 'America/Los_Angeles',
            recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
          },
        } as PublicPost,
        { occurrenceIds: ['2026-07-14T21:00:00.000Z'] },
      )!,
    );
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260714T140000');
  });

  it('emits RRULE for a weekly series', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          recurrence: { freq: 'WEEKLY', interval: 1, count: 4 },
        },
      } as PublicPost)!,
    );
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    expect(ics).toContain('COUNT=4');
  });

  it('emits a timed override with a TZID RECURRENCE-ID for a rescheduled timed exception', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          ...timedEventFields,
          timeZone: 'America/Los_Angeles',
          recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
          exceptions: [
            {
              recurrenceId: '2026-07-14T21:00:00.000Z',
              start: '2026-07-14T23:00:00.000Z',
              end: '2026-07-15T00:00:00.000Z',
            },
          ],
        },
      } as PublicPost)!,
    );
    // Series slot 21:00Z = 14:00 PDT -> RECURRENCE-ID must keep the zone.
    expect(ics).toContain(
      'RECURRENCE-ID;TZID=America/Los_Angeles:20260714T140000',
    );
    // New slot 23:00Z = 16:00 PDT.
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260714T160000');
    expect(ics).toContain('DTEND;TZID=America/Los_Angeles:20260714T170000');
    // A VTIMEZONE must be present for the zone reference.
    expect(ics).toContain('BEGIN:VTIMEZONE');
  });

  it('emits a DATE-form all-day override whose RECURRENCE-ID points at the original occurrence when rescheduled to a different day', () => {
    // The 2026-07-13 occurrence is moved to 2026-07-16. RECURRENCE-ID must
    // identify the *original* slot (2026-07-13) per RFC 5545 3.8.4.4; the
    // override's DTSTART/DTEND stay on the new day (2026-07-16).
    const raw = buildEventIcs({
      ...baseEventPost,
      data: {
        type: 'event' as const,
        name: 'All week',
        content: '',
        start: '2026-07-06T12:00:00.000Z',
        end: '2026-07-12T12:00:00.000Z',
        wholeDay: true,
        recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
        exceptions: [
          {
            recurrenceId: '2026-07-13T12:00:00.000Z',
            start: '2026-07-16T12:00:00.000Z',
            end: '2026-07-16T12:00:00.000Z',
          },
        ],
      },
    } as PublicPost)!;
    const ics = unfoldIcs(raw);
    // Series DTSTART/DTEND stay DATE-form.
    expect(ics).toContain('DTSTART;VALUE=DATE:20260706');
    expect(ics).toContain('DTEND;VALUE=DATE:20260713');
    // The override is an all-day VEVENT on the NEW day in DATE form ...
    expect(ics).toContain('DTSTART;VALUE=DATE:20260716');
    expect(ics).toContain('DTEND;VALUE=DATE:20260717');
    // ... and its RECURRENCE-ID points at the ORIGINAL occurrence date
    // (2026-07-13), never the new one — RFC 5545 3.8.4.4. This fails if the
    // implementation derives RECURRENCE-ID from `exception.start`.
    expect(ics).toContain('RECURRENCE-ID;VALUE=DATE:20260713');
    expect(ics).not.toContain('RECURRENCE-ID:');
    // All-day events carry no zone at all.
    expect(ics).not.toContain('TZID');
    expect(ics).not.toContain('BEGIN:VTIMEZONE');
    // CRLF discipline: no bare `\r` that is not a `\r\n` line break (RFC 5545
    // 2.3). Pins the `withDateRecurrenceId` split that previously produced
    // `\r\r\n` from a CRLF source.
    expect(raw).not.toMatch(/\r(?!\n)/);
  });

  it('keeps clean CRLF line endings for a mix of all-day and timed events in the feed', () => {
    const feed = buildEventsFeedIcs(
      [
        {
          ...baseEventPost,
          data: {
            type: 'event' as const,
            name: 'All week',
            content: '',
            start: '2026-07-06T12:00:00.000Z',
            end: '2026-07-12T12:00:00.000Z',
            wholeDay: true,
            recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
            exceptions: [
              {
                recurrenceId: '2026-07-13T12:00:00.000Z',
                start: '2026-07-16T12:00:00.000Z',
                end: '2026-07-16T12:00:00.000Z',
              },
            ],
          },
        } as PublicPost,
        {
          ...baseEventPost,
          id: '019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e8',
          data: { ...timedEventFields },
        } as PublicPost,
      ],
      { name: 'Mixed feed' },
    );
    // No double carriage return anywhere in the mixed feed.
    expect(feed).not.toMatch(/\r(?!\n)/);
  });

  it('emits EXDATE;VALUE=DATE for a cancelled occurrence of an all-day series', () => {
    const ics = unfoldIcs(
      buildEventIcs({
        ...baseEventPost,
        data: {
          type: 'event' as const,
          name: 'All week',
          content: '',
          start: '2026-07-06T12:00:00.000Z',
          end: '2026-07-12T12:00:00.000Z',
          wholeDay: true,
          recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
          exceptions: [
            { recurrenceId: '2026-07-13T12:00:00.000Z', cancelled: true },
          ],
        },
      } as PublicPost)!,
    );
    // The cancelled occurrence (the series week of 2026-07-13) is excluded with
    // a DATE-form EXDATE matching the series DTSTART value type (RFC 5545
    // 3.8.4.4) — never a UTC instant or zone form.
    expect(ics).toContain('DTSTART;VALUE=DATE:20260706');
    expect(ics).toContain('EXDATE;VALUE=DATE:20260713');
    expect(ics).not.toMatch(/^EXDATE(;TZID[^:]*)?:/m);
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    // All-day events carry no zone at all.
    expect(ics).not.toContain('TZID');
    expect(ics).not.toContain('BEGIN:VTIMEZONE');
  });
});

describe('buildRsvpIcs', () => {
  const recurringFields = {
    ...timedEventFields,
    recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
  };

  it('keeps the series RRULE when no occurrence ids are booked', () => {
    const ics = unfoldIcs(
      buildRsvpIcs({
        ...baseEventPost,
        data: recurringFields,
      } as PublicPost)!,
    );
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    expect(ics).toContain('DTSTART:20260707T210000Z');
  });

  it('emits only the booked occurrence start and end times', () => {
    const ics = unfoldIcs(
      buildRsvpIcs(
        {
          ...baseEventPost,
          data: recurringFields,
        } as PublicPost,
        {
          occurrenceIds: [
            '2026-07-14T21:00:00.000Z',
            '2026-07-28T21:00:00.000Z',
          ],
        },
      )!,
    );
    expect(ics).toContain('DTSTART:20260714T210000Z');
    expect(ics).toContain('DTEND:20260714T220000Z');
    expect(ics).toContain('DTSTART:20260728T210000Z');
    expect(ics).toContain('DTEND:20260728T220000Z');
    expect(ics).not.toContain('DTSTART:20260707T210000Z');
    expect(ics).not.toContain('RRULE');
    expect(ics).toContain(
      'UID:openpeeps-event-019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7-2026-07-14T21:00:00.000Z@openpeepshq',
    );
  });
});

describe('rsvpConfirmationContent', () => {
  it('uses occurrence times instead of the series start', () => {
    const content = rsvpConfirmationContent(
      {
        ...baseEventPost,
        data: {
          ...timedEventFields,
          recurrence: { freq: 'WEEKLY', interval: 1, count: 4 },
        },
      } as PublicPost,
      {
        postUrl: 'https://example.com/posts/event1',
        occurrenceIds: ['2026-07-14T21:00:00.000Z'],
      },
    );
    expect(content?.start).toBe('2026-07-14T21:00:00.000Z');
    expect(content?.end).toBe('2026-07-14T22:00:00.000Z');
    expect(content?.occurrenceCount).toBe(1);
    expect(unfoldIcs(content!.ics)).toContain('DTSTART:20260714T210000Z');
    expect(unfoldIcs(content!.ics)).not.toContain('RRULE');
  });

  it('counts multiple booked dates for the confirmation copy', () => {
    const content = rsvpConfirmationContent(
      {
        ...baseEventPost,
        data: {
          ...timedEventFields,
          recurrence: { freq: 'WEEKLY', interval: 1, count: 4 },
        },
      } as PublicPost,
      {
        postUrl: 'https://example.com/posts/event1',
        occurrenceIds: ['2026-07-14T21:00:00.000Z', '2026-07-21T21:00:00.000Z'],
      },
    );
    expect(content?.occurrenceCount).toBe(2);
    expect(content?.start).toBe('2026-07-14T21:00:00.000Z');
  });
});
describe('buildEventsFeedIcs', () => {
  it('builds one calendar from a mix of timed, zone-aware and all-day events', () => {
    const ics = unfoldIcs(
      buildEventsFeedIcs(
        [
          {
            ...baseEventPost,
            data: {
              ...timedEventFields,
              timeZone: 'America/Los_Angeles',
            },
          } as PublicPost,
          {
            ...baseEventPost,
            id: 'b',
            data: {
              type: 'event' as const,
              name: 'Zone event two',
              content: '',
              start: '2026-07-20T21:00:00.000Z',
              end: '2026-07-20T22:00:00.000Z',
              wholeDay: false,
              timeZone: 'America/Los_Angeles',
            },
          } as PublicPost,
          {
            ...baseEventPost,
            id: 'c',
            data: {
              type: 'event' as const,
              name: 'All day event',
              content: '',
              start: '2026-07-25T00:00:00.000Z',
              end: '2026-07-26T00:00:00.000Z',
              wholeDay: true,
            },
          } as PublicPost,
        ],
        {
          postUrl: 'https://example.com',
          name: 'Test Community',
        },
      ),
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('X-WR-CALNAME:Test Community');
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
    expect(ics).toContain('X-PUBLISHED-TTL:PT1H');
    // Both timed events are present and keep their zone ...
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260707T140000');
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20260720T140000');
    // ... with exactly one deduped VTIMEZONE block for the shared zone.
    expect(ics.match(/BEGIN:VTIMEZONE/g)?.length).toBe(1);
    // The all-day event is DATE-form and carries no zone.
    expect(ics).toContain('DTSTART;VALUE=DATE:20260725');
    expect(ics).toContain('DTEND;VALUE=DATE:20260727');
    expect(ics).not.toContain('X-WR-CALNAME:OpenPeeps Events');
    // The feed ends cleanly with a single calendar close.
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('stamps each event with LAST-MODIFIED and SEQUENCE derived from the post updatedAt', () => {
    const ics = unfoldIcs(
      buildEventsFeedIcs(
        [
          {
            ...baseEventPost,
            updatedAt: '2026-11-01T12:00:00Z',
            data: timedEventFields,
          } as PublicPost,
        ],
        { postUrl: 'https://example.com', name: 'Test Community' },
      ),
    );
    expect(ics).toContain('LAST-MODIFIED:20261101T120000Z');
    // Minutes-since-epoch policy: 2026-11-01T12:00:00Z is exactly 29892240
    // minutes after the epoch.
    expect(ics).toContain('SEQUENCE:29892240');

    // An edit advances the stamp: the later updatedAt yields a higher SEQUENCE.
    const edited = unfoldIcs(
      buildEventsFeedIcs(
        [
          {
            ...baseEventPost,
            updatedAt: '2026-11-01T12:01:00Z',
            data: timedEventFields,
          } as PublicPost,
        ],
        { postUrl: 'https://example.com', name: 'Test Community' },
      ),
    );
    expect(edited).toContain('SEQUENCE:29892241');
  });

  it('omits RSVP/attendee data from the feed output', () => {
    const post = {
      ...baseEventPost,
      data: timedEventFields,
      rsvps: [{ profileId: 'profile1', state: 'yes' }],
    } as unknown as PublicPost;
    const ics = unfoldIcs(
      buildEventsFeedIcs([post], {
        postUrl: 'https://example.com',
        name: 'Test Community',
      }),
    );
    expect(ics).toContain('SUMMARY:Testing with Trivia');
    expect(ics).not.toContain('profile1');
    expect(ics).not.toContain('RSVP');
  });
});
