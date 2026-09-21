import { describe, expect, it } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { pollEndDelayMs, shouldEmitPollEnded } from './pollEnd';

const questionPost = (expiresAt: string | undefined): PostWithMeta =>
  ({
    id: 'poll-1',
    type: 'question',
    data: { type: 'question', options: [], expiresAt },
  }) as PostWithMeta;

describe('pollEndDelayMs', () => {
  it('returns remaining time until expiry', () => {
    const now = Date.parse('2026-09-21T12:00:00.000Z');
    expect(pollEndDelayMs('2026-09-21T12:05:00.000Z', now)).toBe(5 * 60_000);
  });

  it('is negative when the poll already ended', () => {
    const now = Date.parse('2026-09-21T12:00:00.000Z');
    expect(pollEndDelayMs('2026-09-21T11:00:00.000Z', now)).toBe(-60 * 60_000);
  });
});

describe('shouldEmitPollEnded', () => {
  it('emits when the post is still that expired poll', () => {
    const expiresAt = '2026-09-21T12:00:00.000Z';
    expect(shouldEmitPollEnded(questionPost(expiresAt), expiresAt)).toBe(true);
  });

  it('skips a missing post', () => {
    expect(shouldEmitPollEnded(undefined, '2026-09-21T12:00:00.000Z')).toBe(
      false,
    );
  });

  it('skips when expiry was changed after the job was scheduled', () => {
    expect(
      shouldEmitPollEnded(
        questionPost('2026-09-21T13:00:00.000Z'),
        '2026-09-21T12:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('skips non-poll posts', () => {
    const note = {
      id: 'n1',
      type: 'note',
      data: { type: 'note' },
    } as PostWithMeta;
    expect(shouldEmitPollEnded(note, '2026-09-21T12:00:00.000Z')).toBe(false);
  });
});
