import { describe, it, expect } from 'vitest';
import type { PublicPost, PublicProfile } from '../../types';
import {
  buildEventIcs,
  buildRsvpIcs,
  rsvpConfirmationContent,
} from '../eventIcs';

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
