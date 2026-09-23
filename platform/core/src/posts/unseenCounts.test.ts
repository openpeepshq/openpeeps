import { describe, expect, it } from 'vitest';
import type { PgDb } from '../db/pg/client';
import { countUnseenGroupPosts, listUnseenGroupPostIds } from './unseenCounts';

type ExecuteResult = { rows: Record<string, unknown>[] };

const rowDb = (rows: Record<string, unknown>[]) =>
  ({
    execute: async () => ({ rows }) as ExecuteResult,
  }) as unknown as PgDb;

describe('countUnseenGroupPosts', () => {
  it('counts both top-level posts and replies per group', async () => {
    const db = rowDb([
      { group_id: 'g1', cnt: 3 }, // 2 top-level + 1 reply
      { group_id: 'g2', cnt: 1 }, // 1 reply only
    ]);
    const counts = await countUnseenGroupPosts(db, 'profile1', ['g1', 'g2']);
    expect(counts).toEqual({ g1: 3, g2: 1 });
  });

  it('returns zero for groups with no unseen posts', async () => {
    const db = rowDb([]);
    const counts = await countUnseenGroupPosts(db, 'profile1', ['g1', 'g2']);
    expect(counts).toEqual({ g1: 0, g2: 0 });
  });

  it('returns empty object for empty groupIds', async () => {
    const db = rowDb([]);
    const counts = await countUnseenGroupPosts(db, 'profile1', []);
    expect(counts).toEqual({});
  });

  it('does not exclude replies from the count', async () => {
    let captured = '';
    const db = {
      execute: async (query: unknown) => {
        captured = JSON.stringify(query);
        return { rows: [] } as ExecuteResult;
      },
    } as unknown as PgDb;
    await countUnseenGroupPosts(db, 'profile1', ['g1']);
    expect(captured).not.toContain('reply_to');
  });

  it('still excludes posts the profile has already seen', async () => {
    let captured = '';
    const db = {
      execute: async (query: unknown) => {
        captured = JSON.stringify(query);
        return { rows: [] } as ExecuteResult;
      },
    } as unknown as PgDb;
    await countUnseenGroupPosts(db, 'profile1', ['g1']);
    expect(captured).toContain('post_seen');
  });
});

describe('listUnseenGroupPostIds', () => {
  it('returns both top-level posts and replies', async () => {
    const db = rowDb([
      { post_id: 'post-1' },
      { post_id: 'reply-1' },
      { post_id: 'post-2' },
    ]);
    const ids = await listUnseenGroupPostIds(db, 'profile1', 'g1');
    expect(ids).toEqual(['post-1', 'reply-1', 'post-2']);
  });

  it('returns empty array when no unseen posts', async () => {
    const db = rowDb([]);
    const ids = await listUnseenGroupPostIds(db, 'profile1', 'g1');
    expect(ids).toEqual([]);
  });

  it('does not exclude replies from the listing', async () => {
    let captured = '';
    const db = {
      execute: async (query: unknown) => {
        captured = JSON.stringify(query);
        return { rows: [] } as ExecuteResult;
      },
    } as unknown as PgDb;
    await listUnseenGroupPostIds(db, 'profile1', 'g1');
    expect(captured).not.toContain('reply_to');
  });

  it('still excludes posts the profile has already seen', async () => {
    let captured = '';
    const db = {
      execute: async (query: unknown) => {
        captured = JSON.stringify(query);
        return { rows: [] } as ExecuteResult;
      },
    } as unknown as PgDb;
    await listUnseenGroupPostIds(db, 'profile1', 'g1');
    expect(captured).toContain('post_seen');
  });
});
