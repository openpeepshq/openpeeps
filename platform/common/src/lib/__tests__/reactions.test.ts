import { describe, expect, it } from 'vitest';
import { currentReactionsFromEntries } from '../reactions';

describe('currentReactionsFromEntries', () => {
  const profileA = { id: 'a' };
  const profileB = { id: 'b' };

  it('keeps multiple emojis from the same profile', () => {
    const current = currentReactionsFromEntries([
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { reaction: '👍' },
        profile: profileA,
      },
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:01:00.000Z',
        data: { reaction: '👎' },
        profile: profileA,
      },
    ]);
    expect(current).toEqual([
      { reaction: '👍', profile: profileA },
      { reaction: '👎', profile: profileA },
    ]);
  });

  it('applies unreaction per emoji', () => {
    const current = currentReactionsFromEntries([
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { reaction: '👍' },
        profile: profileB,
      },
      {
        type: 'unreaction',
        createdAt: '2026-01-01T00:02:00.000Z',
        data: { reaction: '👍' },
        profile: profileB,
      },
    ]);
    expect(current).toEqual([]);
  });

  it('sorts unsorted entries so the chronologically latest wins dedup', () => {
    // Feed newest-first so the only thing that can preserve "latest wins" is
    // the ascending sort (the DM retraction decision in usePostReactions rests
    // on this order surviving). Without the sort, the stale 👍 entry (first in
    // the array) would win dedup and the current ❤️ would be dropped.
    const current = currentReactionsFromEntries([
      {
        type: 'unreaction',
        createdAt: '2026-01-01T00:02:00.000Z',
        data: { reaction: '👍' },
        profile: profileA,
      },
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:01:00.000Z',
        data: { reaction: '❤️' },
        profile: profileA,
      },
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { reaction: '👍' },
        profile: profileA,
      },
    ]);
    // Ascending order is what survives: the unreaction (latest) clears the 👍,
    // the ❤️ (mid, and still active) remains.
    expect(current).toEqual([{ reaction: '❤️', profile: profileA }]);
  });
});
