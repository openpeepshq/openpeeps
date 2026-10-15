import { describe, expect, it } from 'vitest';
import type { PublicPost, PublicRsvp } from '@openpeepshq/common/types';
import {
  assembleRsvpExportCsv,
  rsvpAttendanceLabel,
  rsvpContactEmail,
  rsvpExportEventEnded,
} from './rsvpExport';

const profile = (id: string, name: string): PublicRsvp['profile'] =>
  ({
    id,
    handle: id,
    displayName: name,
    type: 'local',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  }) as PublicRsvp['profile'];

const rsvp = (
  id: string,
  name: string,
  response: PublicRsvp['response'],
  createdAt: string,
  recurrenceId?: string,
): PublicRsvp => ({
  profile: profile(id, name),
  response,
  createdAt,
  ...(recurrenceId ? { recurrenceId } : {}),
});

const eventPost = (
  rsvps: PublicRsvp[],
  extra: Record<string, unknown> = {},
): PublicPost =>
  ({
    id: 'event-1',
    type: 'event',
    rsvps,
    data: {
      type: 'event',
      content: '',
      start: '2020-01-01T18:00:00.000Z',
      end: '2020-01-01T19:00:00.000Z',
      wholeDay: false,
      ...extra,
    },
  }) as PublicPost;

describe('rsvpContactEmail', () => {
  it('lists every controlling account, in stable order', () => {
    expect(
      rsvpContactEmail({
        profileType: 'local',
        guestEmail: '',
        accountEmails: ['b@example.com', 'a@example.com', 'a@example.com'],
      }),
    ).toBe('a@example.com; b@example.com');
  });

  it('uses the guest address and falls back to an account email', () => {
    expect(
      rsvpContactEmail({
        profileType: 'guest',
        guestEmail: 'guest@example.com',
        accountEmails: ['hidden@example.com'],
      }),
    ).toBe('guest@example.com');
    expect(
      rsvpContactEmail({
        profileType: 'guest',
        guestEmail: '',
        accountEmails: ['guest-account@example.com'],
      }),
    ).toBe('guest-account@example.com');
  });
});

describe('rsvpAttendanceLabel', () => {
  it('distinguishes attended, registered, and no-shows', () => {
    expect(
      rsvpAttendanceLabel({
        response: 'yes',
        attended: true,
        eventEnded: true,
      }),
    ).toBe('attended');
    expect(
      rsvpAttendanceLabel({
        response: 'tentative',
        attended: false,
        eventEnded: false,
      }),
    ).toBe('registered');
    expect(
      rsvpAttendanceLabel({
        response: 'yes',
        attended: false,
        eventEnded: true,
      }),
    ).toBe('no-show');
    expect(
      rsvpAttendanceLabel({
        response: 'no',
        attended: false,
        eventEnded: true,
      }),
    ).toBe('');
  });
});

describe('rsvpExportEventEnded', () => {
  const event = eventPost([]).data as Extract<
    NonNullable<PublicPost['data']>,
    { type: 'event' }
  >;

  it('is false before the event and true after', () => {
    expect(
      rsvpExportEventEnded(
        event,
        undefined,
        new Date('2020-01-01T18:30:00.000Z'),
      ),
    ).toBe(false);
    expect(
      rsvpExportEventEnded(
        event,
        undefined,
        new Date('2020-01-02T00:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

describe('assembleRsvpExportCsv', () => {
  const now = new Date('2020-01-02T00:00:00.000Z');

  it('keeps the latest response, including declines, and escapes commas', () => {
    const csv = assembleRsvpExportCsv({
      post: eventPost([
        rsvp('p1', 'Ada', 'yes', '2020-01-01T00:00:00.000Z'),
        rsvp('p1', 'Ada', 'no', '2020-01-01T01:00:00.000Z'),
        rsvp('p2', 'Bee, Bo', 'yes', '2020-01-01T02:00:00.000Z'),
        rsvp('p3', 'Cy', 'removed', '2020-01-01T03:00:00.000Z'),
      ]),
      emailsByProfileId: new Map([
        ['p1', 'ada@example.com'],
        ['p2', 'bee@example.com'],
      ]),
      now,
    });

    expect(csv).toBe(
      [
        'Name,Email,RSVP Status,RSVP At,Member ID',
        'Ada,ada@example.com,no,2020-01-01T01:00:00.000Z,p1',
        '"Bee, Bo",bee@example.com,yes,2020-01-01T02:00:00.000Z,p2',
        'Cy,,removed,2020-01-01T03:00:00.000Z,p3',
      ].join('\n'),
    );
  });

  it('adds attendance once join records exist', () => {
    const csv = assembleRsvpExportCsv({
      post: eventPost([
        rsvp('p1', 'Ada', 'yes', '2020-01-01T00:00:00.000Z'),
        rsvp('p2', 'Bee', 'tentative', '2020-01-01T01:00:00.000Z'),
        rsvp('p3', 'Cy', 'no', '2020-01-01T02:00:00.000Z'),
      ]),
      emailsByProfileId: new Map(),
      attendeeIds: new Set(['p1']),
      now,
    });

    expect(csv).toBe(
      [
        'Name,Email,RSVP Status,RSVP At,Member ID,Attendance',
        'Ada,,yes,2020-01-01T00:00:00.000Z,p1,attended',
        'Bee,,tentative,2020-01-01T01:00:00.000Z,p2,no-show',
        'Cy,,no,2020-01-01T02:00:00.000Z,p3,',
      ].join('\n'),
    );
  });

  it('marks attending guests as registered before the event ends', () => {
    const csv = assembleRsvpExportCsv({
      post: eventPost([rsvp('p1', 'Ada', 'yes', '2020-01-01T00:00:00.000Z')]),
      emailsByProfileId: new Map([['p1', 'ada@example.com']]),
      attendeeIds: new Set(['someone-else']),
      now: new Date('2020-01-01T18:30:00.000Z'),
    });

    expect(csv).toContain('Attendance');
    expect(csv).toContain(',registered');
  });

  it('scopes a recurring event to the requested occurrence', () => {
    const date = '2020-01-08T18:00:00.000Z';
    const csv = assembleRsvpExportCsv({
      post: eventPost(
        [
          rsvp('p1', 'Ada', 'yes', '2020-01-01T00:00:00.000Z', date),
          rsvp('p1', 'Ada', 'no', '2020-01-01T01:00:00.000Z', date),
          rsvp(
            'p2',
            'Bee',
            'yes',
            '2020-01-01T02:00:00.000Z',
            '2020-01-15T18:00:00.000Z',
          ),
        ],
        {
          recurrence: { freq: 'WEEKLY', interval: 1 },
        },
      ),
      occurrenceId: date,
      emailsByProfileId: new Map([['p1', 'ada@example.com']]),
      now,
    });

    expect(csv.split('\n')).toEqual([
      'Name,Email,RSVP Status,RSVP At,Member ID,Occurrence',
      `Ada,ada@example.com,no,2020-01-01T01:00:00.000Z,p1,${date}`,
    ]);
  });
});
