import { describe, expect, it } from 'vitest';
import { conversationIdAfterCreate } from './useCreateConversation';

describe('conversationIdAfterCreate', () => {
  it('opens a brand-new thread at the created post', () => {
    expect(conversationIdAfterCreate({ id: 'new-root' }, undefined)).toBe(
      'new-root',
    );
  });

  it('opens the existing thread root when the send was appended', () => {
    expect(
      conversationIdAfterCreate({ id: 'new-reply', inReplyToId: 'leaf' }, [
        { id: 'root' },
        { id: 'leaf' },
        { id: 'new-reply' },
      ]),
    ).toBe('root');
  });

  it('falls back to the created post when the thread cannot be loaded', () => {
    expect(
      conversationIdAfterCreate(
        { id: 'new-reply', inReplyToId: 'leaf' },
        undefined,
      ),
    ).toBe('new-reply');
  });
});
