import { describe, expect, it } from 'vitest';
import type { PgDb } from '../db/pg/client';
import type { PostWithMeta } from '@openpeepshq/common/types';
import {
  listOneToOneConversationPostIds,
  listOneToOneConversationRootLeaves,
  mergeOneToOnePreviews,
} from './conversationQueries';

type ExecuteResult = { rows: Record<string, unknown>[] };

const rowDb = (rows: Record<string, unknown>[]) =>
  ({
    execute: async () => ({ rows }) as ExecuteResult,
  }) as unknown as PgDb;

const capturingDb = (rows: Record<string, unknown>[]) => {
  let captured = '';
  const db = {
    execute: async (query: unknown) => {
      captured = JSON.stringify(query);
      return { rows } as ExecuteResult;
    },
  } as unknown as PgDb;
  return { db, getQuery: () => captured };
};

const id = (n: number) =>
  `01970000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`;

const post = (
  postId: string,
  participantIdsList: string[],
  visibility: 'direct' | 'group' = 'direct',
): PostWithMeta =>
  ({
    id: postId,
    visibility,
    audience: participantIdsList.map((profileId) => ({ id: profileId })),
    profile: { id: participantIdsList[0] },
  }) as unknown as PostWithMeta;

describe('listOneToOneConversationPostIds', () => {
  it('maps rows to ascending ids', async () => {
    const db = rowDb([{ id: id(1) }, { id: id(2) }]);
    expect(
      await listOneToOneConversationPostIds(db, 'profile1', 'profile2'),
    ).toEqual([id(1), id(2)]);
  });

  it('queries pair posts and walks reply descendants', async () => {
    const { db, getQuery } = capturingDb([]);
    await listOneToOneConversationPostIds(db, 'profile1', 'profile2');
    const query = getQuery();
    expect(query).toContain('WITH RECURSIVE');
    expect(query).toContain("visibility = 'direct'");
    expect(query).toContain('deleted_at IS NULL');
    // Participants = audience ∪ creator, exactly the pair.
    expect(query).toContain('creator_id = ');
    expect(query).toContain('a.to_id <> ');
    // Descendant walk so system "left" posts are included.
    expect(query).toContain('FROM reply_to rt');
    expect(query).toContain('ORDER BY id');
  });
});

describe('listOneToOneConversationRootLeaves', () => {
  it('maps rows to root/leaf pairs', async () => {
    const db = rowDb([
      { root_id: id(1), leaf_id: id(5) },
      { root_id: id(2), leaf_id: id(6) },
    ]);
    expect(await listOneToOneConversationRootLeaves(db, 'a', 'b')).toEqual([
      { rootId: id(1), leafId: id(5) },
      { rootId: id(2), leafId: id(6) },
    ]);
  });

  it('restricts start posts to roots (no parent reply)', async () => {
    const { db, getQuery } = capturingDb([]);
    await listOneToOneConversationRootLeaves(db, 'a', 'b');
    const query = getQuery();
    expect(query).toContain('NOT EXISTS');
    expect(query).toContain('SELECT 1 FROM reply_to rt');
    expect(query).toContain('DISTINCT ON (root_id)');
  });
});

describe('mergeOneToOnePreviews', () => {
  it('collapses 1:1 entries of the same pair into [oldest root, newest leaf]', () => {
    const rootA = post(id(1), ['profile1', 'profile2']);
    const leafA = post(id(3), ['profile1', 'profile2']);
    const rootB = post(id(2), ['profile1', 'profile2']);
    const leafB = post(id(4), ['profile1', 'profile2']);

    expect(
      mergeOneToOnePreviews([
        [rootB, leafB],
        [rootA, leafA],
      ]),
    ).toEqual([[rootA, leafB]]);
  });

  it('keeps group conversations separate per root', () => {
    const groupA = post(id(1), ['profile1', 'profile2', 'profile3']);
    const groupB = post(id(2), ['profile1', 'profile2', 'profile3']);
    expect(mergeOneToOnePreviews([[groupA], [groupB]])).toEqual([
      [groupB],
      [groupA],
    ]);
  });

  it('passes non-direct conversations through unchanged', () => {
    const article = post(id(1), ['profile1'], 'group');
    expect(mergeOneToOnePreviews([[article]])).toEqual([[article]]);
  });

  it('handles single-post 1:1 entries', () => {
    const solo = post(id(1), ['profile1', 'profile2']);
    expect(mergeOneToOnePreviews([[solo]])).toEqual([[solo]]);
  });

  it('orders by newest merged leaf first', () => {
    const oldRoot = post(id(1), ['profile1', 'profile2']);
    const oldLeaf = post(id(2), ['profile1', 'profile2']);
    const newRoot = post(id(3), ['profile1', 'profile2']);
    const newLeaf = post(id(4), ['profile1', 'profile2']);
    const group = post(id(5), ['profile1', 'profile3', 'profile4']);

    expect(
      mergeOneToOnePreviews([[oldRoot, oldLeaf], [newRoot, newLeaf], [group]]),
    ).toEqual([[group], [oldRoot, newLeaf]]);
  });
});
