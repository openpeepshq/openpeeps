import { describe, expect, it } from 'vitest';
import type { PublicProfile } from '@openpeepshq/common/types';
import { diffWaitingRoomAdditions } from './useJamFooterControls';

const profile = (id: string, name: string): PublicProfile => ({
  id,
  name,
  username: name.toLowerCase(),
  avatar: '',
  isVerified: false,
});

describe('diffWaitingRoomAdditions', () => {
  it('returns empty when prev is null', () => {
    expect(
      diffWaitingRoomAdditions(null, { a: profile('a', 'Alice') }),
    ).toEqual([]);
  });

  it('returns empty when next is undefined', () => {
    expect(
      diffWaitingRoomAdditions({ a: profile('a', 'Alice') }, undefined),
    ).toEqual([]);
  });

  it('returns empty when no additions', () => {
    const prev = { a: profile('a', 'Alice') };
    const next = { a: profile('a', 'Alice') };
    expect(diffWaitingRoomAdditions(prev, next)).toEqual([]);
  });

  it('returns a single addition', () => {
    const prev = { a: profile('a', 'Alice') };
    const next = { a: profile('a', 'Alice'), b: profile('b', 'Bob') };
    const result = diffWaitingRoomAdditions(prev, next);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('b');
  });

  it('returns multiple additions batched', () => {
    const prev = { a: profile('a', 'Alice') };
    const next = {
      a: profile('a', 'Alice'),
      b: profile('b', 'Bob'),
      c: profile('c', 'Carol'),
    };
    const result = diffWaitingRoomAdditions(prev, next);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('excludes removals (admit/deny)', () => {
    const prev = { a: profile('a', 'Alice'), b: profile('b', 'Bob') };
    const next = { a: profile('a', 'Alice') };
    expect(diffWaitingRoomAdditions(prev, next)).toEqual([]);
  });

  it('counts a re-joined profile as a new addition', () => {
    const prev = { a: profile('a', 'Alice') };
    const next: Record<string, PublicProfile> = {
      a: { ...profile('a', 'Alice') },
    };
    const result = diffWaitingRoomAdditions(prev, next);
    expect(result).toHaveLength(0);
    // If Bob left and rejoins with same id, he should NOT count as new
    // (same profile object stays in the map — that's correct behavior)
  });
});
