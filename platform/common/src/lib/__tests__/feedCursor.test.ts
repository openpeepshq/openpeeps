import { describe, expect, it } from 'vitest';
import { encodeFeedCursor, parseFeedCursor } from '../feedCursor';

describe('feedCursor', () => {
  it('encodes activity + id for timeline pagination', () => {
    expect(
      encodeFeedCursor({
        id: '11111111-1111-4111-8111-111111111111',
        lastActivityAt: '2026-09-01T12:00:00.000Z',
      }),
    ).toBe('2026-09-01T12:00:00.000Z|11111111-1111-4111-8111-111111111111');
  });

  it('falls back to id when activity is missing', () => {
    expect(encodeFeedCursor({ id: 'post-1' })).toBe('post-1');
    expect(encodeFeedCursor({})).toBeUndefined();
  });

  it('parses a compound cursor and a legacy id cursor', () => {
    expect(
      parseFeedCursor(
        '2026-09-01T12:00:00.000Z|11111111-1111-4111-8111-111111111111',
      ),
    ).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      lastActivityAt: '2026-09-01T12:00:00.000Z',
    });
    expect(parseFeedCursor('post-1')).toEqual({ id: 'post-1' });
    expect(parseFeedCursor()).toBeUndefined();
  });

  it('round-trips identical activity timestamps via the id tie-break', () => {
    const a = encodeFeedCursor({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
    });
    const b = encodeFeedCursor({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parseFeedCursor(a)?.lastActivityAt).toBe(
      parseFeedCursor(b)?.lastActivityAt,
    );
    expect(parseFeedCursor(a)?.id).not.toBe(parseFeedCursor(b)?.id);
  });
});
