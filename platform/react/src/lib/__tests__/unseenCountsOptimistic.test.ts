import { describe, expect, it } from 'vitest';
import { applyUnseenCountsAdjustment } from '../unseenCountsOptimistic';

describe('applyUnseenCountsAdjustment', () => {
  const base = {
    groups: { g1: 3, g2: 0 },
    direct: { c1: 2, c2: 1 },
  };

  it('decrements a group count', () => {
    expect(applyUnseenCountsAdjustment(base, { groupId: 'g1' })).toEqual({
      groups: { g1: 2, g2: 0 },
      direct: { c1: 2, c2: 1 },
    });
  });

  it('does not go below zero for groups', () => {
    expect(applyUnseenCountsAdjustment(base, { groupId: 'g2' })).toEqual({
      groups: { g1: 3, g2: 0 },
      direct: { c1: 2, c2: 1 },
    });
  });

  it('clears a group', () => {
    expect(applyUnseenCountsAdjustment(base, { clearGroup: 'g1' })).toEqual({
      groups: { g1: 0, g2: 0 },
      direct: { c1: 2, c2: 1 },
    });
  });

  it('decrements a conversation and removes the key at zero', () => {
    expect(
      applyUnseenCountsAdjustment(base, { conversationRootId: 'c2' }),
    ).toEqual({
      groups: { g1: 3, g2: 0 },
      direct: { c1: 2 },
    });
  });

  it('clears a conversation thread', () => {
    expect(
      applyUnseenCountsAdjustment(base, { clearConversation: 'c1' }),
    ).toEqual({
      groups: { g1: 3, g2: 0 },
      direct: { c2: 1 },
    });
  });

  it('handles missing cache data', () => {
    expect(applyUnseenCountsAdjustment(undefined, { groupId: 'g1' })).toEqual({
      groups: { g1: 0 },
      direct: {},
    });
  });
});
