import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { openpeepsClient } from '@openpeepshq/client';
import type { UnseenPostCounts } from '@openpeepshq/common/types';
import {
  adjustUnseenCounts,
  applyUnseenCountsAdjustment,
  isUnseenCountsQueryKey,
  markGroupPostsRead,
} from '../unseenCountsOptimistic';

const mockClient = {
  posts: {
    unseenCounts: {
      queryKey: () => ['posts', 'unseen', 'counts'],
    },
  },
} as unknown as ReturnType<typeof openpeepsClient>;

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

describe('isUnseenCountsQueryKey', () => {
  it('matches the canonical key and prefixed variants', () => {
    expect(isUnseenCountsQueryKey(['posts', 'unseen', 'counts'])).toBe(true);
    expect(
      isUnseenCountsQueryKey(['', 'posts', 'unseen', 'counts', undefined]),
    ).toBe(true);
    expect(isUnseenCountsQueryKey(['posts', 'list'])).toBe(false);
  });
});

describe('adjustUnseenCounts', () => {
  it('clears the group on every matching unseen-counts query', () => {
    const queryClient = new QueryClient();
    const counts: UnseenPostCounts = {
      groups: { g1: 4, g2: 1 },
      direct: {},
    };
    queryClient.setQueryData(['posts', 'unseen', 'counts'], counts);
    queryClient.setQueryData(['', 'posts', 'unseen', 'counts'], counts);

    adjustUnseenCounts(queryClient, mockClient, { clearGroup: 'g1' });

    expect(
      queryClient.getQueryData<UnseenPostCounts>(['posts', 'unseen', 'counts'])
        ?.groups,
    ).toEqual({ g1: 0, g2: 1 });
    expect(
      queryClient.getQueryData<UnseenPostCounts>([
        '',
        'posts',
        'unseen',
        'counts',
      ])?.groups,
    ).toEqual({ g1: 0, g2: 1 });
  });

  it('decrements a group once even when the canonical key is also cached', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['posts', 'unseen', 'counts'], {
      groups: { g1: 4 },
      direct: {},
    });

    adjustUnseenCounts(queryClient, mockClient, { groupId: 'g1' });

    expect(
      queryClient.getQueryData<UnseenPostCounts>(['posts', 'unseen', 'counts'])
        ?.groups.g1,
    ).toBe(3);
  });
});

describe('markGroupPostsRead', () => {
  it('keeps the group cleared after a successful mark', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['posts', 'unseen', 'counts'], {
      groups: { g1: 3 },
      direct: {},
    });
    const mark = vi.fn().mockResolvedValue({ success: true });

    await markGroupPostsRead(queryClient, mockClient, 'g1', mark);

    expect(mark).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(
      queryClient.getQueryData<UnseenPostCounts>(['posts', 'unseen', 'counts'])
        ?.groups.g1,
    ).toBe(0);
  });
});
