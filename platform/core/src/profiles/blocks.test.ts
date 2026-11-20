import { describe, expect, it, vi } from 'vitest';
import { isBlockedPair } from '@openpeepshq/common/lib';
import { loadBlockIds } from './blocks';

// The auto-follow skip (followDesignatedProfiles) calls isBlockedPair on the
// blockingIds/blockedByIds that withBlockIds populates from loadBlockIds.
// Pin that pair against the real block-id loading so the skip is proven
// against actual block data, not a hand-set array (review round-3 item 1).
const fakeDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ fromId: 'p2', toId: 'p2' }])),
    })),
  })),
} as never;

describe('isBlockedPair against loadBlockIds output', () => {
  it('treats a loaded block as a blocked pair', async () => {
    const { blockingIds, blockedByIds } = await loadBlockIds(fakeDb, 'p1');
    expect({ blockingIds, blockedByIds }).toEqual({
      blockingIds: ['p2'],
      blockedByIds: ['p2'],
    });
    expect(isBlockedPair({ blockingIds, blockedByIds }, 'p2')).toBe(true);
  });

  it('does not treat an unblocked id as a blocked pair', async () => {
    const { blockingIds, blockedByIds } = await loadBlockIds(fakeDb, 'p1');
    expect(isBlockedPair({ blockingIds, blockedByIds }, 'p9')).toBe(false);
  });
});
