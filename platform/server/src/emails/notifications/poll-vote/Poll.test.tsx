import { describe, expect, it, vi } from 'vitest';
import type { EmailGlobals, Json } from '@openpeepshq/common/types';

vi.mock('@openpeepshq/core/email', () => ({
  registerEmailRenderer: vi.fn(),
}));

import { registerEmailRenderer } from '@openpeepshq/core/email';
import { registerDefaultEmailTemplates } from '../../index';
import { reactEmailRenderer } from '../../renderer';
import pollVoteTemplate from './index';
import pollEndedTemplate from '../poll-ended';

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

const notification = (type: string) =>
  ({
    id: 'notification-1',
    profileId: 'author',
    type,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    recipientProfile: { id: 'author', handle: 'author', displayName: 'Author' },
    senderProfile: { id: 'voter', handle: 'voter', displayName: 'Voter' },
    post: {
      id: 'post-1',
      type: 'question',
      profile: { id: 'author', handle: 'author', displayName: 'Author' },
      data: {
        type: 'question',
        content: 'Which night works?',
        options: [{ content: 'Friday' }, { content: 'Saturday' }],
      },
    },
  }) as unknown as Record<string, Json>;

describe('poll notification emails', () => {
  it('registers email templates for the poll notification types', () => {
    registerDefaultEmailTemplates();
    const ids = vi
      .mocked(registerEmailRenderer)
      .mock.calls.map(([templateId]) => templateId);
    expect(ids).toContain('notification-pollVote');
    expect(ids).toContain('notification-pollEnded');
  });

  it('renders the poll vote email for the author', async () => {
    const { subject, html } = await reactEmailRenderer(pollVoteTemplate)({
      to: 'author@example.com',
      template: 'notification-pollVote',
      globals,
      locals: notification('pollVote'),
    });

    expect(subject).toBe(
      'emails.pollVote.subject communityName=Test Community',
    );
    expect(html).toContain('emails.pollVote.body profileName=Voter');
    expect(html).toContain('Friday');
    expect(html).toContain('https://example.com/posts/post-1');
  });

  it('renders the poll ended email with a link to the results', async () => {
    const { subject, html } = await reactEmailRenderer(pollEndedTemplate)({
      to: 'voter@example.com',
      template: 'notification-pollEnded',
      globals,
      locals: notification('pollEnded'),
    });

    expect(subject).toBe(
      'emails.pollEnded.subject communityName=Test Community',
    );
    expect(html).toContain('emails.pollEnded.body');
    expect(html).toContain('https://example.com/posts/post-1');
  });
});
