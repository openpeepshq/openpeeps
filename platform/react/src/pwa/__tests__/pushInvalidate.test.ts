import { describe, expect, it } from 'vitest';
import {
  dedupeQueryKeys,
  normalizePushInvalidateMessage,
} from '../pushInvalidate';

describe('normalizePushInvalidateMessage', () => {
  it('parses legacy array payloads', () => {
    expect(
      normalizePushInvalidateMessage([
        ['profiles', 'current', 'notifications', 'stats'],
        ['posts'],
      ]),
    ).toEqual({
      keys: [
        ['profiles', 'current', 'notifications', 'stats'],
        ['posts'],
      ],
    });
  });

  it('parses object payloads with stats', () => {
    expect(
      normalizePushInvalidateMessage({
        keys: [['conversations']],
        notificationStats: { unseen: 2, unread: 1 },
      }),
    ).toEqual({
      keys: [['conversations']],
      notificationStats: { unseen: 2, unread: 1 },
    });
  });
});

describe('dedupeQueryKeys', () => {
  it('removes duplicate query keys', () => {
    expect(
      dedupeQueryKeys([
        ['posts'],
        ['posts'],
        ['conversations'],
      ]),
    ).toEqual([['posts'], ['conversations']]);
  });
});
