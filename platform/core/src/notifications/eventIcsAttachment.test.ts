import { describe, expect, it } from 'vitest';
import type { ExpandedNotification } from '@openpeepshq/common/types';
import { eventIcsEmailAttachment } from './eventIcsAttachment';

const rootUrl = 'https://community.example';

/** ICS folds long lines with CRLF + space; unwrap for assertions. */
const unfoldIcs = (ics: string): string => ics.replace(/\r?\n[ \t]/g, '');

const notification = (post: unknown): ExpandedNotification =>
  ({ post }) as ExpandedNotification;

const eventPost = {
  id: '019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7',
  type: 'event',
  data: {
    type: 'event',
    name: 'Trivia night',
    content: 'Bring a team',
    start: '2026-07-07T21:00:00.000Z',
    end: '2026-07-07T22:00:00.000Z',
    wholeDay: false,
  },
};

describe('eventIcsEmailAttachment', () => {
  it('returns nothing when the notification is not about an event', () => {
    expect(
      eventIcsEmailAttachment(
        notification({
          id: 'note-1',
          type: 'note',
          data: { type: 'note', content: 'hello' },
        }),
        rootUrl,
      ),
    ).toBeUndefined();
    expect(
      eventIcsEmailAttachment(notification(undefined), rootUrl),
    ).toBeUndefined();
  });

  it('attaches the event calendar file', () => {
    const attachment = eventIcsEmailAttachment(
      notification(eventPost),
      rootUrl,
    );

    expect(attachment?.filename).toBe('event.ics');
    expect(attachment?.contentType).toBe(
      'text/calendar; method=PUBLISH; charset=utf-8',
    );
    const ics = unfoldIcs(attachment?.content ?? '');
    expect(ics).toContain('SUMMARY:Trivia night');
    expect(ics).toContain(`${rootUrl}/posts/${eventPost.id}`);
  });

  it('uses the original event when the notification post is a repost', () => {
    const attachment = eventIcsEmailAttachment(
      notification({
        id: 'repost-1',
        type: 'note',
        data: { type: 'note', content: 'sharing this' },
        repost: eventPost,
      }),
      rootUrl,
    );

    const ics = unfoldIcs(attachment?.content ?? '');
    expect(ics).toContain('SUMMARY:Trivia night');
    expect(ics).toContain(`${rootUrl}/posts/${eventPost.id}`);
  });
});
