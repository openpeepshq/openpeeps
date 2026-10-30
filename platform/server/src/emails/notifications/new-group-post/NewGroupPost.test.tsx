import { describe, expect, it, vi } from 'vitest';
import type { EmailGlobals, Json } from '@openpeepshq/common/types';

vi.mock('@openpeepshq/core/email', () => ({
  registerEmailRenderer: vi.fn(),
}));

import { reactEmailRenderer } from '../../renderer';
import template from './index';

const globals = {
  communityConfig: {
    info: { name: 'Test Community', contactEmail: 'team@example.com' },
    theme: { light: { logoSmall: 'https://example.com/logo.png' } },
  },
  serverData: { rootUrl: 'https://example.com' },
  i18nContext: {
    i18n: {},
    t: (key: string, opts?: Record<string, string>) =>
      Object.entries(opts ?? {}).reduce(
        (text, [name, value]) => `${text} ${name}=${value}`,
        key,
      ),
  },
  timeZone: 'UTC',
} as unknown as EmailGlobals;

const notification = (type: 'note' | 'event' | 'resource', repost = false) =>
  ({
    id: 'notification-1',
    profileId: 'member',
    type: 'newGroupPost',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    recipientProfile: {
      id: 'member',
      handle: 'member',
      displayName: 'Member',
    },
    senderProfile: { id: 'ada', handle: 'ada', displayName: 'Ada' },
    group: { id: 'group-1', handle: 'book-club', displayName: 'Book Club' },
    post: {
      id: 'post-1',
      type,
      profile: { id: 'ada', handle: 'ada', displayName: 'Ada' },
      repost: repost
        ? {
            id: 'post-0',
            type: 'note',
            profile: { id: 'bea', handle: 'bea', displayName: 'Bea' },
            data: { type: 'note', content: 'Original' },
          }
        : undefined,
      data:
        type === 'event'
          ? {
              type: 'event',
              name: 'Reading night',
              content: 'Bring a book',
              start: '2026-10-10T18:00:00.000Z',
              end: '2026-10-10T20:00:00.000Z',
              wholeDay: false,
              timeZone: 'UTC',
            }
          : type === 'resource'
            ? {
                type: 'resource',
                title: 'Example resource',
                resourceKind: 'link',
                url: 'https://example.com',
                content: 'A useful link',
              }
            : { type: 'note', content: 'Hello group' },
    },
  }) as unknown as Record<string, Json>;

const render = (type: 'note' | 'event' | 'resource', repost = false) =>
  reactEmailRenderer(template)({
    to: 'member@example.com',
    template: 'notification-newGroupPost',
    globals,
    locals: notification(type, repost),
  });

describe('new group post notification email', () => {
  it('uses the post subject for a note', async () => {
    const { subject, html } = await render('note');

    expect(subject).toContain('emails.newGroupPost.subject');
    expect(subject).toContain('profileName=Ada');
    expect(subject).toContain('groupName=Book Club');
    expect(html).toContain('emails.newGroupPost.title');
  });

  it('uses the event subject when the group post is an event', async () => {
    const { subject, html } = await render('event');

    expect(subject).toContain('emails.newGroupPost.eventSubject');
    expect(subject).toContain('profileName=Ada');
    expect(subject).toContain('groupName=Book Club');
    expect(subject).not.toContain('emails.newGroupPost.subject');
    expect(html).toContain('emails.newGroupPost.eventTitle');
  });

  it('keeps the repost subject when an event post is a repost', async () => {
    const { subject } = await render('event', true);

    expect(subject).toContain('emails.newGroupPost.repostSubject');
  });

  it('renders the resource embed when the group post is a resource', async () => {
    const { html } = await render('resource');

    expect(html).toContain('Example resource');
    // Regression for #1753: ResourceCard used app providers that are absent
    // in static email renders, which replaced the post with an error dump.
    expect(html).not.toContain('OpenpeepsProvider');
  });
});
