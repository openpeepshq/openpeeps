import { describe, expect, it, vi } from 'vitest';
import type { EmailGlobals, Json } from '@openpeepshq/common/types';

vi.mock('@openpeepshq/core/email', () => ({
  registerEmailRenderer: vi.fn(),
}));

import { registerEmailRenderer } from '@openpeepshq/core/email';
import { registerDefaultEmailTemplates } from '../../index';
import { reactEmailRenderer } from '../../renderer';
import rsvpTemplate from './index';
import rsvpCanceledTemplate from '../rsvp-canceled';

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

const notification = (type: string, data?: unknown) =>
  ({
    id: 'notification-1',
    profileId: 'host',
    type,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    recipientProfile: { id: 'host', handle: 'host', displayName: 'Host' },
    senderProfile: { id: 'guest', handle: 'guest', displayName: 'Guest' },
    post: {
      id: 'post-1',
      type: 'event',
      profile: { id: 'host', handle: 'host', displayName: 'Host' },
      data: {
        type: 'event',
        name: 'Jam night',
        content: 'Bring your instrument',
        start: '2026-10-10T18:00:00.000Z',
        end: '2026-10-10T20:00:00.000Z',
        timeZone: 'UTC',
      },
    },
    data,
  }) as unknown as Record<string, Json>;

describe('host RSVP notification emails', () => {
  it('registers email templates for the host RSVP notification types', () => {
    registerDefaultEmailTemplates();
    const ids = vi
      .mocked(registerEmailRenderer)
      .mock.calls.map(([templateId]) => templateId);
    expect(ids).toContain('notification-rsvp');
    expect(ids).toContain('notification-rsvpCanceled');
  });

  it('renders the new RSVP email for the host', async () => {
    const { subject, html } = await reactEmailRenderer(rsvpTemplate)({
      to: 'host@example.com',
      template: 'notification-rsvp',
      globals,
      locals: notification('rsvp'),
    });

    expect(subject).toBe('emails.rsvp.subject communityName=Test Community');
    expect(html).toContain('emails.rsvp.body profileName=Guest');
    expect(html).toContain('https://example.com/posts/post-1');
  });

  it('renders the canceled RSVP email with the canceled dates', async () => {
    const { subject, html } = await reactEmailRenderer(rsvpCanceledTemplate)({
      to: 'host@example.com',
      template: 'notification-rsvpCanceled',
      globals,
      locals: notification('rsvpCanceled', {
        occurrenceIds: [],
        series: false,
      }),
    });

    expect(subject).toBe('emails.rsvpCanceled.subject profileName=Guest');
    expect(html).toContain(
      'emails.rsvpCanceled.body profileName=Guest eventName=Jam night',
    );
    expect(html).toContain('Oct');
    expect(html).toContain('https://example.com/posts/post-1');
  });
});
