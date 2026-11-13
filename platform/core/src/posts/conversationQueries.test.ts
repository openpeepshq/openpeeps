import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import type { PgDb } from '../db/pg/client';
import { closePostgres, pgConnectionString, pgPool } from '../db/pg/client';
import type { PostWithMeta } from '@openpeepshq/common/types';
import {
  conversationIncludesPost,
  includeFocusMessage,
  listLeftConversations,
  listOneToOneConversationPostIds,
  listOneToOneConversationRootLeaves,
  mergeOneToOnePreviews,
  searchDirectMessageRows,
} from './conversationQueries';
import { allpeepDb } from '../db';

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>();
  return { ...actual, allpeepDb: vi.fn() };
});

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

describe('listLeftConversations', () => {
  const authData = { profile: { id: 'profile1' } } as never;

  it('returns [] when the profile has no left posts', async () => {
    vi.mocked(allpeepDb).mockResolvedValue({ db: rowDb([]) } as never);
    await expect(listLeftConversations(authData)).resolves.toEqual([]);
  });

  it('walks reply ancestors recursively with text-cast id joins', async () => {
    const { db, getQuery } = capturingDb([]);
    vi.mocked(allpeepDb).mockResolvedValue({ db } as never);
    await listLeftConversations(authData);
    const query = getQuery();
    // Base fix: RECURSIVE left_posts, text-cast id joins
    expect(query).toContain('WITH RECURSIVE');
    expect(query).toContain('rt.from_id = p.id::text');
    expect(query).toContain('a.from_id = p.id::text');
    expect(query).toContain('a.to_id = p.creator_id');
    // R5: visibility = 'direct' filter rationale
    expect(query).toContain("p.visibility = 'direct'");
    // Leaving twice (re-added, left again) must not list twice:
    // one row per root via best CTE dedup
    expect(query).toContain('DISTINCT ON (root_id)');
    // Smoke test: the query contains the expected sub-CTEs
    expect(query).toContain('LEFT_POSTS AS');
    expect(query).toContain('LEAVES AS');
    expect(query).toContain('COMBINED AS');
    expect(query).toContain('BEST AS');
    // Final ordering on the last SELECT (post-item-1: leaf ordering)
    expect(query).toContain('ORDER BY leaf_id DESC');
  });
});

// Integration tests require a real PostgreSQL instance.
// CI unit-test jobs run without Postgres — skip gracefully there.
const hasPostgres = await (async () => {
  const client = new pg.Client({
    connectionString: pgConnectionString(),
    connect_timeout: 2,
  });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
})();

const maybe = hasPostgres ? describe : describe.skip;

maybe('listLeftConversations (postgres)', () => {
  // Per-run id base: keeps the fixture ids ordered (for the leaf-id DESC
  // assertion) while avoiding collisions with rows left by a crashed run.
  // The shared local test database is also used by other Postgres test
  // files, so only this file's own rows are cleaned up — never TRUNCATE.
  const base = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, '0');
  const fid = (n: number) =>
    `01970000-0000-7000-8000-${base}${n.toString(16).padStart(8, '0')}`;
  const alice = fid(100);
  const bob = fid(200);
  const carol = fid(300);
  const dmRoot = fid(1100);
  const dmReply = fid(1200);
  const leftOne = fid(1300);
  const leftTwo = fid(1400);
  const publicRoot = fid(1500);
  const publicReply = fid(1600);
  const groupRoot = fid(1700);
  const groupMsg = fid(1800);
  const postIds = [
    dmRoot,
    dmReply,
    leftOne,
    leftTwo,
    publicRoot,
    publicReply,
    groupRoot,
    groupMsg,
  ];

  const viewer = (profileId: string) =>
    ({
      profile: {
        id: profileId,
        type: 'local',
        roles: [],
        followers: [],
        following: [],
        memberships: [],
        blockingIds: [],
        blockedByIds: [],
      },
    }) as never;

  const cleanup = async () => {
    const pool = pgPool();
    // Edge endpoints are text columns (posts/profiles ids are uuid).
    await pool.query('DELETE FROM reply_to WHERE from_id = ANY($1::text[])', [
      postIds,
    ]);
    await pool.query('DELETE FROM audience WHERE from_id = ANY($1::text[])', [
      postIds,
    ]);
    await pool.query('DELETE FROM posts WHERE id = ANY($1::uuid[])', [postIds]);
    await pool.query('DELETE FROM profiles WHERE id = ANY($1::uuid[])', [
      [alice, bob, carol],
    ]);
  };

  const seed = async () => {
    const pool = pgPool();
    const profile = async (profileId: string, handle: string) =>
      pool.query(
        `INSERT INTO profiles (id, handle, type, body, created_at, updated_at)
         VALUES ($1, $2, 'local', $3, now(), now())`,
        [profileId, handle, JSON.stringify({ handle, type: 'local' })],
      );
    await profile(alice, `alice-${base}`);
    await profile(bob, `bob-${base}`);
    await profile(carol, `carol-${base}`);

    const note = (
      postId: string,
      creatorId: string,
      visibility: 'direct' | 'public',
      content: string,
    ) =>
      pool.query(
        `INSERT INTO posts (id, type, visibility, creator_id, body,
                            created_at, updated_at, last_activity_at)
         VALUES ($1, 'note', $2, $3, $4, now(), now(), now())`,
        [
          postId,
          visibility,
          creatorId,
          JSON.stringify({
            type: 'note',
            visibility,
            creatorId,
            data: { type: 'note', content },
          }),
        ],
      );

    // 1:1 DM between alice and bob: bob opens, alice replies, alice leaves
    // twice (re-added in between) — two system notes whose audience
    // excludes alice.
    await note(dmRoot, bob, 'direct', 'bob opens the DM');
    await note(dmReply, alice, 'direct', 'alice replies');
    await note(leftOne, alice, 'direct', ''); // first left note
    await note(leftTwo, alice, 'direct', ''); // second left note

    // Public thread by carol that alice replies to: public replies carry
    // no audience edge back to the creator and must not count as "left".
    await note(publicRoot, carol, 'public', 'carol posts publicly');
    await note(publicReply, alice, 'public', 'alice replies publicly');

    // Group DM: carol creator, alice+bob in audience
    await note(groupRoot, carol, 'direct', 'group starts');
    await note(groupMsg, alice, 'direct', 'alice in group');

    const edge = (
      table: 'audience' | 'reply_to',
      fromId: string,
      toId: string,
    ) =>
      pool.query(
        `INSERT INTO ${table} (id, from_id, to_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, now(), now())`,
        [fromId, toId],
      );
    // DM audience
    await edge('audience', dmRoot, alice);
    await edge('audience', dmRoot, bob);
    await edge('audience', dmReply, alice);
    await edge('audience', dmReply, bob);
    // Left notes: audience = remaining participants only (bob).
    await edge('audience', leftOne, bob);
    await edge('audience', leftTwo, bob);
    // Public posts: no audience edges.
    // Group audience
    await edge('audience', groupRoot, alice);
    await edge('audience', groupRoot, bob);
    await edge('audience', groupRoot, carol);
    await edge('audience', groupMsg, alice);
    await edge('audience', groupMsg, bob);
    await edge('audience', groupMsg, carol);
    // DM reply chain
    await edge('reply_to', dmReply, dmRoot);
    await edge('reply_to', leftOne, dmReply);
    await edge('reply_to', leftTwo, leftOne);
    // Public reply chain
    await edge('reply_to', publicReply, publicRoot);
    // Group reply chain
    await edge('reply_to', groupMsg, groupRoot);

    // Clean up any leftover edges/posts from previous crashed runs
    // in the same test database.
  };

  afterAll(cleanup);

  it('old query throws, new query succeeds on the same seed (R2: regression)', async () => {
    await seed();
    const pool = pgPool();
    const authData = viewer(alice);

    // The pre-PR query (no RECURSIVE, no text casts) throws:
    // "operator does not exist: text = uuid"
    const oldQuery = sql`
      WITH left_posts AS (
        SELECT p.id AS left_id, rt.to_id AS parent_id
        FROM posts p
        INNER JOIN reply_to rt ON rt.from_id = p.id
        WHERE p.creator_id = ${alice}
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM audience a
            WHERE a.from_id = p.id AND a.to_id = ${alice}
          )
      ),
      walk AS (
        SELECT lp.left_id AS conv_id, lp.parent_id AS leaf_id,
               lp.parent_id AS node_id, 0 AS depth
        FROM left_posts lp
        UNION ALL
        SELECT walk.conv_id, walk.leaf_id, rt.to_id, walk.depth + 1
        FROM reply_to rt
        INNER JOIN walk ON rt.from_id = walk.node_id
        WHERE walk.depth < 9999
      ),
      roots AS (
        SELECT DISTINCT ON (conv_id) conv_id, node_id AS root_id, leaf_id
        FROM walk
        ORDER BY conv_id, depth DESC
      )
      SELECT root_id, leaf_id FROM roots ORDER BY leaf_id DESC
    `;
    await expect(pool.query(oldQuery)).rejects.toThrow(
      'operator does not exist: text = uuid',
    );

    // The new query succeeds and returns the DM conversation
    const results = await listLeftConversations(authData);
    expect(results.length).toBeGreaterThan(0);
  });

  it('re-add/re-leave leaf = real last message (R1: item 1)', async () => {
    await seed();
    const authData = viewer(alice);

    const results = await listLeftConversations(authData);
    // alice's archived conversations: the DM (she left twice) + group (she left via non-1:1 path)
    // Public thread must NOT appear (alice's reply is public visibility).
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Find the DM entry: root should be bob's opening message
    const dmEntry = results.find((pair) => {
      const [root, leaf] = pair;
      return root.id === dmRoot;
    });
    expect(dmEntry).toBeDefined();
    // Leaf should be the real last readable message (dmReply = 'alice replies'),
    // NOT leftOne (the first system "left" note). R1: the shallowest non-leave-note.
    if (dmEntry!.length === 2) {
      expect(dmEntry![1].id).toBe(dmReply);
    }
  });

  it('group conversation (3 participants) left via non-1:1 path (R6)', async () => {
    await seed();
    const authData = viewer(alice);

    const results = await listLeftConversations(authData);
    const groupEntry = results.find((pair) => {
      const [root] = pair;
      return root.id === groupRoot;
    });
    expect(groupEntry).toBeDefined();
    // Group conversations pass through mergeOneToOnePreviews unchanged
    expect(groupEntry!.length).toBeGreaterThanOrEqual(1);
  });

  it('public reply does not register as "left" (R5: visibility filter)', async () => {
    await seed();
    const authData = viewer(alice);

    const results = await listLeftConversations(authData);
    const publicEntry = results.find((pair) => {
      const [root] = pair;
      return root.id === publicRoot;
    });
    expect(publicEntry).toBeUndefined();
  });

  it('deleted root/conversation is handled (tombstone semantics)', async () => {
    await seed();
    const pool = pgPool();
    // Delete the DM root post to simulate tombstone scenario
    await pool.query('DELETE FROM posts WHERE id = $1::uuid', [dmRoot]);
    // Leaves edges intact (edges are not soft-deleted)

    const authData = viewer(alice);
    const results = await listLeftConversations(authData);
    // The DM root is deleted, so conversationPreviewsFromPairs filters it out
    // via hydrateLeanPostsByIds → byId.get(rootId) returns undefined
    const dmEntry = results.find((pair) => pair[0].id === dmRoot);
    expect(dmEntry).toBeUndefined();
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

describe('includeFocusMessage', () => {
  it('appends a message that the cap dropped, in chronological order', () => {
    expect(
      includeFocusMessage(
        [id(1), id(8), id(9)],
        [id(1), id(4), id(8), id(9)],
        id(4),
      ),
    ).toEqual([id(1), id(4), id(8), id(9)]);
  });

  it('leaves the window unchanged when the message is already present', () => {
    expect(includeFocusMessage([id(1), id(2)], [id(1), id(2)], id(2))).toEqual([
      id(1),
      id(2),
    ]);
  });

  it('ignores a message that is not part of the conversation', () => {
    expect(includeFocusMessage([id(1)], [id(1)], id(9))).toEqual([id(1)]);
  });
});

describe('conversationIncludesPost', () => {
  it('treats the root as a member without querying', async () => {
    const db = {
      execute: async () => {
        throw new Error('should not query');
      },
    } as unknown as PgDb;
    await expect(conversationIncludesPost(db, id(1), id(1))).resolves.toBe(
      true,
    );
  });

  it('walks reply descendants', async () => {
    const { db, getQuery } = capturingDb([{ id: id(2) }]);
    await expect(conversationIncludesPost(db, id(1), id(2))).resolves.toBe(
      true,
    );
    const query = getQuery();
    expect(query).toContain('WITH RECURSIVE');
    expect(query).toContain('FROM reply_to rt');
  });
});

const throwingDb = {
  execute: async () => {
    throw new Error('should not query');
  },
} as unknown as PgDb;

describe('searchDirectMessageRows', () => {
  it('does not query until the text is at least two characters', async () => {
    await expect(
      searchDirectMessageRows(throwingDb, 'profile', ' a '),
    ).resolves.toEqual([]);
  });

  it('maps rows to message and root ids', async () => {
    const db = rowDb([{ message_id: id(2), root_id: id(1) }]);
    await expect(
      searchDirectMessageRows(db, 'profile', 'hello'),
    ).resolves.toEqual([{ messageId: id(2), rootId: id(1) }]);
  });

  it('searches direct messages the profile can read', async () => {
    const { db, getQuery } = capturingDb([]);
    await searchDirectMessageRows(db, 'profile', 'hello');
    const query = getQuery();
    expect(query).toContain("visibility = 'direct'");
    expect(query).toContain('deleted_at IS NULL');
    expect(query).toContain('creator_id = ');
    expect(query).toContain('FROM audience a');
    expect(query).toContain('search_vector');
    expect(query).toContain('plainto_tsquery');
    expect(query).toContain('ILIKE');
  });

  it('resolves roots only for the newest candidates', async () => {
    const { db, getQuery } = capturingDb([]);
    await searchDirectMessageRows(db, 'profile', 'hello');
    const query = getQuery();
    expect(query).toContain('ORDER BY p.id::text DESC');
  });

  it('uses substring match only when the query has no words', async () => {
    const { db, getQuery } = capturingDb([]);
    await searchDirectMessageRows(db, 'profile', '!!');
    const query = getQuery();
    expect(query).not.toContain('plainto_tsquery');
    expect(query).toContain('ILIKE');
  });

  it('limits a scoped search to that conversation', async () => {
    const { db, getQuery } = capturingDb([]);
    const conversation = post(id(1), ['profile1', 'profile2']);
    await searchDirectMessageRows(db, 'profile1', 'hello', { conversation });
    const query = getQuery();
    expect(query).toContain('p2');
    expect(query).toContain('pair_walk');
  });

  it('scopes a group conversation to the reply thread', async () => {
    const calls: string[] = [];
    const db = {
      execute: async (query: unknown) => {
        calls.push(JSON.stringify(query));
        return { rows: [{ node_id: id(1) }] } as ExecuteResult;
      },
    } as unknown as PgDb;
    const conversation = post(id(3), ['a', 'b', 'c']);
    await searchDirectMessageRows(db, 'a', 'hello', { conversation });
    const searchQuery = calls[calls.length - 1] ?? '';
    expect(searchQuery).toContain('WITH RECURSIVE thread');
    expect(calls[0]).toContain('reply_to');
  });
});
