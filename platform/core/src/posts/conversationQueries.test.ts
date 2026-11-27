import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import pg from 'pg';
import type { PgDb } from '../db/pg/client';
import {
  closePostgres,
  initPostgres,
  pgConnectionString,
  pgPool,
} from '../db/pg/client';
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

describe('listLeftConversations (string matching)', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('returns [] when the profile has no left posts', async () => {
    // The static import above already loaded the real module (and its real
    // '../db'), so reset the registry before re-importing with the mock.
    vi.resetModules();
    const allpeepDbMock = vi.fn().mockResolvedValue({
      db: rowDb([]),
    } as never);
    vi.doMock('../db', async () => {
      const actual = await vi.importActual<typeof import('../db')>('../db');
      return { ...actual, allpeepDb: allpeepDbMock };
    });
    const { listLeftConversations: lcc } = await import(
      './conversationQueries'
    );
    await expect(
      lcc({ profile: { id: 'profile1' } } as never),
    ).resolves.toEqual([]);
  });

  it('walks reply ancestors recursively with text-cast id joins', async () => {
    // Same registry caveat as the test above.
    vi.resetModules();
    const { db, getQuery } = capturingDb([]);
    const allpeepDbMock = vi.fn().mockResolvedValue({ db } as never);
    vi.doMock('../db', async () => {
      const actual = await vi.importActual<typeof import('../db')>('../db');
      return { ...actual, allpeepDb: allpeepDbMock };
    });
    const { listLeftConversations: lcc } = await import(
      './conversationQueries'
    );
    await lcc({ profile: { id: 'profile1' } } as never);
    const query = getQuery();
    // Base fix: RECURSIVE left_posts, text-cast id joins
    expect(query).toContain('WITH RECURSIVE');
    expect(query).toContain('rt.from_id = p.id::text');
    expect(query).toContain('a.from_id = p.id::text');
    expect(query).toContain('a.to_id = p.creator_id');
    // R5: visibility = 'direct' filter rationale
    expect(query).toContain("p.visibility = 'direct'");
    // String-level smoke pin only: the name `best` / its DISTINCT ON are
    // implementation details; the dedup behavior itself (one row per root
    // when leaving twice) is locked functionally in the (postgres) block.
    expect(query).toContain('DISTINCT ON (root_id)');
    // Smoke test: the query contains the expected sub-CTEs
    expect(query).toContain('left_posts AS');
    expect(query).toContain('leaves AS');
    expect(query).toContain('combined AS');
    expect(query).toContain('best AS');
    // String-level smoke pin only: newest-leaf-first ordering is verified
    // functionally in the (postgres) block via the fixture id ordering.
    expect(query).toContain('ORDER BY leaf_id DESC');
  });
});

// Integration tests require a reachable PostgreSQL instance — the probe
// gates on connectivity only (CI's test-unit job provides the postgres
// service; a developer without a local database gets a graceful skip).
// Schema readiness is handled in the (postgres) block's beforeAll, which
// must run after this module-load-time probe, so the probe must not check
// tables: the per-worker database created by vitest.setup.ts has no
// schema until migrations have run.
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
if (!hasPostgres) {
  // Loud skip: a silently missing Postgres would void every regression
  // lock in the (postgres) block below.
  console.warn(
    '[conversationQueries.test] Postgres unreachable — integration tests SKIPPED (DATABASE_URL=' +
      (process.env.DATABASE_URL ?? '(unset, default localhost:5432)') +
      ')',
  );
}

maybe('listLeftConversations (postgres)', () => {
  // Id base keeps the fixture ids ordered (for the leaf-id DESC
  // assertion) and, derived from the vitest worker index, gives each
  // concurrent worker a disjoint id range. Under the repo's vitest setup
  // every worker already gets its own database (vitest.setup.ts appends
  // _w${VITEST_POOL_ID}), so the disjoint ids matter when running
  // off-vitest or against a manually shared database, where two workers
  // with the same base would collide on the fixed profile ids and break
  // the re-leave counts. That database is shared with other Postgres
  // test files there, so only this file's own rows are cleaned up —
  // never TRUNCATE. seed() delete-then-inserts over the known id set,
  // so stale rows from a crashed run cannot leak into a later run.
  const poolId = Number(process.env.VITEST_POOL_ID ?? '0');
  const base = (Number.isFinite(poolId) ? poolId : 0)
    .toString(16)
    .padStart(4, '0');
  const fid = (n: number) =>
    `01970000-0000-7000-8000-${base}${n.toString(16).padStart(8, '0')}`;
  const alice = fid(100);
  const bob = fid(200);
  const carol = fid(300);
  const dmRoot = fid(1100);
  const dmReply = fid(1200);
  const newMsg = fid(1300);
  const leftOne = fid(1400);
  const leftTwo = fid(1500);
  const leftThree = fid(1600);
  const publicRoot = fid(1700);
  const publicReply = fid(1800);
  const groupRoot = fid(1900);
  const groupMsg = fid(2000);
  const groupLeaveNote = fid(2100);
  const postIds = [
    dmRoot,
    dmReply,
    newMsg,
    leftOne,
    leftTwo,
    leftThree,
    publicRoot,
    publicReply,
    groupRoot,
    groupMsg,
    groupLeaveNote,
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

  const findPair = (results: PostWithMeta[][], rootId: string) =>
    results.find((pair) => pair[0]?.id === rootId);

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
    // Tripwire: a fixture edit that adds a post/profile without extending
    // the delete lists above would leak into the reused database — fail
    // loudly here (locks the "stale rows cannot leak" promise).
    const prefix = `01970000-0000-7000-8000-${base}%`;
    const leftProfiles = await pool.query(
      'SELECT count(*)::int AS n FROM profiles WHERE id::text LIKE $1',
      [prefix],
    );
    const leftPosts = await pool.query(
      'SELECT count(*)::int AS n FROM posts WHERE id::text LIKE $1',
      [prefix],
    );
    expect(leftProfiles.rows[0].n).toBe(0);
    expect(leftPosts.rows[0].n).toBe(0);
  };

  const seed = async () => {
    const pool = pgPool();
    // Clean up any leftover edges/posts from previous crashed runs
    // in the same test database before inserting.
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

    const profile = async (profileId: string, handle: string) =>
      pool.query(
        `INSERT INTO profiles (id, handle, type, body, created_at, updated_at)
         VALUES ($1, $2, 'local', $3, now(), now())`,
        [profileId, handle, JSON.stringify({ handle, type: 'local' })],
      );
    await profile(alice, `alice-${base}`);
    await profile(bob, `bob-${base}`);
    await profile(carol, `carol-${base}`);

    // Timestamps are now(): created_at carries no ordering semantics in
    // this suite — the walk orders by uuid (leaf_id/depth), not by time,
    // so the id ordering below is the only ordering that matters.
    // published_at mirrors production: createPost sets it for every
    // non-draft post, and the shared posts defaultFilter (drafts hidden)
    // would otherwise treat these legacy rows as drafts.
    const note = (
      postId: string,
      creatorId: string,
      visibility: 'direct' | 'public',
      content: string,
    ) =>
      pool.query(
        `INSERT INTO posts (id, type, visibility, creator_id, body,
                            created_at, updated_at, last_activity_at, published_at)
         VALUES ($1, 'note', $2, $3, $4, now(), now(), now(), now())`,
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

    // 1:1 DM between alice and bob: bob opens, alice replies, alice
    // leaves (re-added), bob posts, alice leaves again — three system
    // notes whose audience excludes alice.
    await note(dmRoot, bob, 'direct', 'bob opens the DM');
    await note(dmReply, alice, 'direct', 'alice replies');
    await note(leftOne, alice, 'direct', ''); // first left note
    await note(newMsg, bob, 'direct', 'bob replies after re-add');
    await note(leftTwo, alice, 'direct', ''); // second left note
    await note(leftThree, alice, 'direct', ''); // third left note

    // Public thread by carol that alice replies to: public replies carry
    // no audience edge back to the creator and must not count as "left".
    await note(publicRoot, carol, 'public', 'carol posts publicly');
    await note(publicReply, alice, 'public', 'alice replies publicly');

    // Group DM: carol creator, alice+bob in audience; alice replies.
    // createPost links the passed audience verbatim (audienceToLink
    // injects no author), so alice's groupMsg keeps her only because this
    // seed passes her explicitly — mirroring the real web reply flow,
    // which inherits the thread audience (creator included).
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
    // DM audience: both participants on the open, the reply, and the
    // post made after the re-add.
    await edge('audience', dmRoot, alice);
    await edge('audience', dmRoot, bob);
    await edge('audience', dmReply, alice);
    await edge('audience', dmReply, bob);
    await edge('audience', newMsg, alice);
    await edge('audience', newMsg, bob);
    // Leave notes: audience = remaining participants only (bob), so they
    // count as "left" (no edge back to the creator, alice).
    await edge('audience', leftOne, bob);
    await edge('audience', leftTwo, bob);
    await edge('audience', leftThree, bob);
    // Public posts: no audience edges.
    // Group audience: all three on both posts. The leave note below is
    // the only post that drops alice (audience = bob+carol, the leaver
    // excluded), which is exactly what registers it as a leave.
    await edge('audience', groupRoot, alice);
    await edge('audience', groupRoot, bob);
    await edge('audience', groupRoot, carol);
    await edge('audience', groupMsg, alice);
    await edge('audience', groupMsg, bob);
    await edge('audience', groupMsg, carol);
    // DM reply chain: bob's second message is a reply to alice's reply
    // (the production re-add → reply shape: createPost inherits the
    // thread audience), and each leave note replies to the thread's
    // newest post.
    await edge('reply_to', dmReply, dmRoot);
    await edge('reply_to', newMsg, dmReply);
    await edge('reply_to', leftOne, dmReply);
    await edge('reply_to', leftTwo, newMsg);
    await edge('reply_to', leftThree, leftTwo);
    // Public reply chain
    await edge('reply_to', publicReply, publicRoot);
    // Group reply chain: alice's reply, then the production-shaped leave
    // note — a direct system note from alice replying to the thread's
    // newest post (leaveConversation's non-1:1 path), whose audience is
    // the remaining participants (bob, carol) with the leaver excluded —
    // exactly what makes it a left post (no edge back to alice).
    await edge('reply_to', groupMsg, groupRoot);
    await note(groupLeaveNote, alice, 'direct', '');
    await edge('audience', groupLeaveNote, bob);
    await edge('audience', groupLeaveNote, carol);
    await edge('reply_to', groupLeaveNote, groupMsg);
  };

  beforeAll(async () => {
    // The per-worker database (vitest.setup.ts) is created fresh and is
    // not migrated by the setup file — bring it up through the app's own
    // init path (advisory-locked migrations) before any raw SQL in this
    // file runs. Idempotent: a reused worker database (journal already
    // applied) is a no-op, as is the later allpeepDb() call from
    // listLeftConversations.
    await initPostgres();
  });

  afterAll(async () => {
    // Delete this file's rows, then end the shared pool so the vitest
    // worker can exit (aligned with analytics/read.test.ts). Uses the
    // statically imported closePostgres: after vi.resetModules() a
    // re-import would yield a fresh pg/client whose pool was never opened.
    await cleanup();
    await closePostgres();
  });

  it('old query throws, new query succeeds on the same seed (R2: regression)', async () => {
    await seed();
    const pool = pgPool();
    const authData = viewer(alice);

    // The pre-PR listLeftConversations statement, verbatim from main
    // @ dd4afaf6 (only ${profile.id} → $1, otherwise byte-for-byte): no
    // WITH RECURSIVE, uncast uuid = text joins. R2 regression lock: it
    // fails at plan time on the seeded schema while the shipped query
    // succeeds on the same seed.
    const oldQueryText = `WITH left_posts AS (
  SELECT p.id AS left_id, rt.to_id AS parent_id
  FROM posts p
  INNER JOIN reply_to rt ON rt.from_id = p.id
  WHERE p.creator_id = $1
    AND p.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM audience a
      WHERE a.from_id = p.id AND a.to_id = p.creator_id
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
SELECT root_id, leaf_id FROM roots ORDER BY leaf_id DESC`;
    // Assert the plan-time signature specifically — any unrelated error
    // (e.g. a syntax error introduced by a future edit of the embedded
    // statement) must not masquerade as the old-bug signature.
    await expect(pool.query(oldQueryText, [alice])).rejects.toThrowError(
      /text = uuid/i,
    );

    // Negative control: the shipped query does NOT throw on the same
    // seed. listLeftConversations goes through allpeepDb() (its first
    // call in this worker initializes + migrates the worker database),
    // so a regression that breaks the new statement fails here loudly.
    // The count/membership of the result is pinned in R1, so this only
    // needs to prove the statement executes.
    await listLeftConversations(authData);
  });

  it('re-add/re-leave leaf = real last message (R1: item 1)', async () => {
    await seed();
    const authData = viewer(alice);

    const results = await listLeftConversations(authData);
    // On the production-exact seed the leaver archives exactly two
    // conversations — the DM (left twice) and the group (left via the
    // non-1:1 leave note). Pin the exact set rather than a lower bound:
    // a spurious extra entry (e.g. a public thread slipping the
    // visibility filter) must fail here.
    expect(results.map((pair) => pair[0]!.id).sort()).toEqual(
      [dmRoot, groupRoot].sort(),
    );

    // The public thread must NOT appear (alice's reply is public
    // visibility) — guard the visibility filter on top of the count pin.
    expect(results.some((pair) => pair[0]!.id === publicRoot)).toBe(false);

    // DM entry: root is bob's opening message, leaf the real last message
    // the leaver can still read. The two leave chains surface different
    // readable leaves — chain 1 (leftOne → dmReply → dmRoot) resolves to
    // dmReply, chain 2 (leftTwo/leftThree → newMsg → dmReply → dmRoot)
    // to newMsg — and the archived entry must surface newMsg: the
    // best CTE's `ORDER BY root_id, leaf_id DESC` picks the newest
    // readable leaf per root (the leave notes themselves are excluded).
    // A silently dropped leaf or a stale-leaf choice must fail here.
    const dmEntry = findPair(results, dmRoot);
    expect(dmEntry).toBeDefined();
    expect(dmEntry![0].id).toBe(dmRoot);
    expect(dmEntry![1].id).toBe(newMsg);

    // Multi-root 1:1 merge end-to-end: alice left the DM three times, so
    // the SQL emits three conv_id rows for the same root chain; the pair
    // must surface exactly once from listLeftConversations (best-CTE
    // dedup + mergeOneToOnePreviews).
    const dmRootCount = results.filter((pair) => pair[0]!.id === dmRoot).length;
    expect(dmRootCount).toBe(1);
  });

  it('group conversation (3 participants) left via non-1:1 path (R6)', async () => {
    await seed();
    const authData = viewer(alice);

    const results = await listLeftConversations(authData);
    const groupEntry = findPair(results, groupRoot);
    expect(groupEntry).toBeDefined();
    // The fixture mirrors production leaveConversation's non-1:1 path:
    // a direct leave note (groupLeaveNote) replying to the thread's
    // newest post, whose audience keeps the leaver out (bob+carol only),
    // while the leaver's own message (groupMsg) keeps her audience edge
    // — the shape createPost produces. So the leave note is the only
    // left post and the leaf anchor, groupMsg is not a left post, and the
    // newest readable leaf is groupMsg — [oldest root, newest readable
    // leaf], exactly what active participants of the thread would see.
    // Group conversations pass through mergeOneToOnePreviews unchanged.
    expect(groupEntry!.length).toBe(2);
    expect(groupEntry![0].id).toBe(groupRoot);
    expect(groupEntry![1].id).toBe(groupMsg);
  });

  it('public reply does not register as "left" (R5: visibility filter)', async () => {
    await seed();
    const authData = viewer(alice);

    const results = await listLeftConversations(authData);
    expect(findPair(results, publicRoot)).toBeUndefined();
  });

  it('soft-deleted root is walked and surfaces as a tombstone', async () => {
    await seed();
    const pool = pgPool();
    // Soft delete (production semantics): the row stays, only deleted_at is
    // set, and the reply_to/audience edges are never removed.
    await pool.query(
      'UPDATE posts SET deleted_at = now() WHERE id = $1::uuid',
      [dmRoot],
    );

    const authData = viewer(alice);
    // The walk has no deleted_at filter, so a soft-deleted root is still
    // walked; hydrateLeanPostsByIds uses postContextMappingForProfile's
    // softDelete:false, so the deleted root resolves as a tombstone
    // (deletedAt set) rather than being dropped — the doc block's
    // "deleted posts surface as tombstones" promise, locked here.
    const results = await listLeftConversations(authData);
    const dmEntry = findPair(results, dmRoot);
    expect(dmEntry).toBeDefined();
    expect(dmEntry![0].deletedAt).toBeTruthy();
    expect(dmEntry![1].id).toBe(newMsg);
  });

  it('soft-deleted middle resolves through reply_to edges and surfaces as a tombstone leaf', async () => {
    await seed();
    const pool = pgPool();
    // Soft delete the DM's middle post in the longer leave chains — bob's
    // post-after-re-add (leftTwo → newMsg → dmReply → dmRoot). The walk
    // and the leaves CTE carry no deleted_at filter, and
    // hydrateLeanPostsByIds uses softDelete:false, so the chains still
    // resolve through the reply_to edges and the deleted middle is the
    // shallowest readable node of those chains — the leaf. The archived
    // entry surfaces it as a tombstone rather than dropping it, matching
    // the active inbox's deletion semantics (the doc block's deleted-post
    // note, locked here for the middle case).
    await pool.query(
      'UPDATE posts SET deleted_at = now() WHERE id = $1::uuid',
      [newMsg],
    );

    const authData = viewer(alice);
    const results = await listLeftConversations(authData);
    const dmEntry = findPair(results, dmRoot);
    expect(dmEntry).toBeDefined();
    expect(dmEntry![0].id).toBe(dmRoot);
    expect(dmEntry![1].id).toBe(newMsg);
    expect(dmEntry![1].deletedAt).toBeTruthy();
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
