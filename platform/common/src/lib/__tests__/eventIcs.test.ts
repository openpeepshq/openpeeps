import { describe, it, expect } from 'vitest';
import type { PublicPost, PublicProfile } from '../../types';
import { buildEventIcs } from '../eventIcs';

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
});
