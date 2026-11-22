import type { PublicPost } from '@openpeepshq/common/types';
import { describe, expect, it } from 'vitest';
import {
  conversationParticipantNames,
  conversationTitle,
} from './conversationTitle';

const t = (key: string, options?: Record<string, unknown>): string => {
  const templates: Record<string, string> = {
    'common.you': 'You',
    'conversations.titleWithYou': '{{names}} and You',
  };
  const template = templates[key];
  if (!template) return key;
  return template.replace(/{{\s*(\w+)\s*}}/g, (_m, v: string) =>
    String(options?.[v] ?? ''),
  );
};

const member = (id: string, displayName?: string) =>
  ({
    id,
    displayName,
    handle: id.replace(/[^a-z0-9]/g, '').toLowerCase() || 'user',
  }) as PublicPost['audience'][number];

const post = (id: string, audience: PublicPost['audience']): PublicPost =>
  ({
    id,
    visibility: 'direct',
    audience,
    data: { type: 'note' },
  }) as never;

describe('conversationTitle (issue #1851 round 9 S3)', () => {
  it('names the other participants from the last post (viewer excluded)', () => {
    const conversation = [
      post('root', [member('me'), member('ada', 'Ada')]),
      post('last', [
        member('me'),
        member('ada', 'Ada'),
        member('grace', 'Grace'),
      ]),
    ];
    expect(conversationTitle(conversation, t, 'me')).toBe('Ada, Grace');
  });

  it('falls back to the root post only when the last post names nobody else', () => {
    const conversation = [
      post('root', [member('me'), member('ada', 'Ada')]),
      // A leaver (or note-to-self) left the current audience with only the
      // viewer: the root participant is used instead of "You".
      post('last', [member('me')]),
    ];
    expect(
      conversationTitle(conversation, t, 'me', { fallbackToRoot: true }),
    ).toBe('Ada');
    // Without the fallback the current (empty) view wins → "You".
    expect(conversationTitle(conversation, t, 'me')).toBe('You');
  });

  it('"You" only when neither last nor root post names anyone else', () => {
    const conversation = [
      post('root', [member('me')]),
      post('last', [member('me')]),
    ];
    expect(
      conversationTitle(conversation, t, 'me', { fallbackToRoot: true }),
    ).toBe('You');
  });

  it('withYou renders the inbox form; without it, names-only (picker form)', () => {
    const conversation = [
      post('root', [member('me'), member('ada', 'Ada')]),
      post('last', [member('me'), member('ada', 'Ada')]),
    ];
    expect(conversationTitle(conversation, t, 'me', { withYou: true })).toBe(
      'Ada and You',
    );
    expect(conversationTitle(conversation, t, 'me')).toBe('Ada');
  });

  it('conversationParticipantNames joins raw names and is empty for an empty conversation', () => {
    expect(
      conversationParticipantNames(
        [post('last', [member('me'), member('ada', 'Ada')])],
        'me',
      ),
    ).toBe('Ada');
    expect(conversationParticipantNames([], 'me')).toBe('');
  });
});
