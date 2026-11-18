import { beforeEach, describe, expect, it, vi } from 'vitest';

// ingestCommitOps is the firehose data plane: it applies at-least-once
// commits to local projections. These tests pin its idempotency contract
// (round-5/round-7 review headline): a re-delivered create is a no-op, a
// delete finds the tracked row and tombstones it before retracting the edge,
// and a duplicate remote handle never fails the batch (collision suffix).
//
// The pg client is mocked with a shape-agnostic builder. Every
// `db.select(...).from(table).where(pred)...limit(...)` resolves a row set for
// THAT table (disambiguated by the drizzle table name, robust to query
// interleaving) FILTERED by the drizzle `where` predicate: the predicate tree
// is introspected into `col = value` / `col IS NULL` constraints, so the
// ingest-tracking helpers (`hasActiveIngestLike`/`hasActiveIngestFollow`/
// `findIngestedLikePostByRkey`) are exercised against a real
// `(did, collection, rkey)`-style match — a row keyed to another DID or rkey
// no longer satisfies a query for a different one (round-9 review item 4).
// Row fixtures therefore carry the PG column names (`deleted_at`, `at_uri`,
// `post_id`, ...) for the filtered columns and the camelCase keys for the
// columns the code projects back out. Inserts and updates are captured (with
// their resolved table) so assertions verify *which* table was touched.
// `findProfileByDid` is a LOCAL function in ingest.ts that reads the profiles
// table via pgDb (it is not the profiles/finders export), so actor lookups
// consume `profilesRows` — the fixtures below are full rows filtered by the
// query's columns. The domain mutations (createPost/reactToPost/follow/...)
// and the `findProfile`/`findPost` finders are mocked directly, so their call
// arguments carry the (actor, post) identity the assertions check.

// Drizzle predicate introspection: walk the queryChunks tree collecting
// column leaves and value literals, pairing each column with the operator
// fragment that follows it (` = ` vs ` is null`). Only the shapes the ingest
// path builds (`and`/`or`/`eq`/`isNull`) are recognized; anything else is
// ignored, so an unrecognized predicate behaves like "no filter" rather than
// "no rows" (it still exercises the real columns for every query shape that
// does parse).
const pgColumn = (col: Record<PropertyKey, unknown>): string => {
  const sym = Object.getOwnPropertySymbols(col).find(
    (item) => item.description === 'drizzle:Name',
  );
  return sym ? String(col[sym]) : String(col.name);
};
const predicateTokens = (
  node: unknown,
): Array<{ col?: string; val?: string; frag?: string }> => {
  const out: Array<{ col?: string; val?: string; frag?: string }> = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const obj = n as Record<string, unknown>;
    if (Array.isArray(obj.queryChunks)) {
      for (const c of obj.queryChunks) walk(c);
      return;
    }
    if (obj.name !== undefined && obj.table !== undefined) {
      out.push({
        col: pgColumn(obj as unknown as Record<PropertyKey, unknown>),
      });
      return;
    }
    if (obj.value !== undefined) {
      if (typeof obj.value === 'string') out.push({ val: obj.value });
      else if (Array.isArray(obj.value)) out.push({ frag: obj.value.join('') });
    }
  };
  walk(node);
  return out;
};
const whereConstraints = (
  pred: unknown,
): { eq: Array<{ col: string; val: string }>; isNull: string[] } => {
  const toks = predicateTokens(pred);
  const eq: Array<{ col: string; val: string }> = [];
  const isNull: string[] = [];
  for (let i = 0; i < toks.length; i += 1) {
    if (toks[i].col === undefined) continue;
    const nxt = toks[i + 1];
    if (nxt?.frag?.includes(' is null')) {
      isNull.push(toks[i].col as string);
      i += 1;
    } else if (nxt?.frag?.includes('=')) {
      const value = toks[i + 2];
      if (value?.val !== undefined) {
        eq.push({ col: toks[i].col as string, val: value.val });
        i += 2;
      }
    }
  }
  return { eq, isNull };
};
const rowMatches = (row: Record<string, unknown>, pred: unknown): boolean => {
  const { eq, isNull } = whereConstraints(pred);
  for (const { col, val } of eq) if (row[col] !== val) return false;
  for (const col of isNull)
    if (row[col] !== null && row[col] !== undefined) return false;
  return true;
};

const profilesRows: Array<Record<string, unknown>[]> = [];
const postsRows: Array<Record<string, unknown>[]> = [];
const atRecordsRows: Array<Record<string, unknown>[]> = [];
const inserts: Array<Record<string, unknown>> = [];
const updates: Array<{
  table: string;
  set: Record<string, unknown>;
  where: unknown;
}> = [];

const tableKey = (table: unknown): string => {
  const symbols = Object.getOwnPropertySymbols(
    table as Record<PropertyKey, unknown>,
  );
  const sym = symbols.find((item) => item.description === 'drizzle:Name');
  return sym ? String((table as Record<PropertyKey, unknown>)[sym]) : 'unknown';
};
const rowsFor = (table: string) =>
  table === 'posts'
    ? postsRows
    : table === 'at_records'
      ? atRecordsRows
      : profilesRows;
const makeSelect = () => {
  let table = 'profiles';
  let wherePred: unknown = null;
  const builder = {
    from: (t: unknown) => {
      table = tableKey(t);
      return builder;
    },
    where: (pred: unknown) => {
      wherePred = pred;
      return builder;
    },
    orderBy: () => builder,
    limit: () => {
      const queue = rowsFor(table);
      const rows = queue.length ? (queue.shift() ?? []) : [];
      return Promise.resolve(
        wherePred === null
          ? rows
          : rows.filter((row) => rowMatches(row, wherePred)),
      );
    },
  };
  return builder;
};
const makeUpdate = (table: unknown) => ({
  set: (set: Record<string, unknown>) => ({
    where: (where: unknown) => {
      updates.push({ table: tableKey(table), set, where });
      return Promise.resolve();
    },
  }),
});
const insertBuilder = {
  // A real Promise (so `await insert(values)` settles) with the
  // onConflictDoNothing chain method attached, mirroring drizzle's builder.
  // The row is captured at `.values()` time: the profiles insert has no
  // onConflictDoNothing, only the atRecords tracking inserts do.
  values: (values: Record<string, unknown>) => {
    inserts.push(values);
    const query = Promise.resolve() as Promise<void> & {
      onConflictDoNothing: () => Promise<void>;
    };
    query.onConflictDoNothing = () => Promise.resolve();
    return query;
  },
};
const deleteBuilder = { where: () => Promise.resolve() };

vi.mock('../db/pg/client', () => ({
  pgDb: () => ({
    select: () => makeSelect(),
    insert: () => insertBuilder,
    update: (table: unknown) => makeUpdate(table),
    delete: () => deleteBuilder,
  }),
}));
vi.mock('../config', () => ({
  config: async () => ({ atproto: { handleDomain: 'community.example' } }),
}));
const pdsHostAllowed = vi.fn(async () => true);
const canIngestFrom = vi.fn(
  async (): Promise<{ allowed: boolean; reason?: string }> => ({
    allowed: true,
  }),
);
vi.mock('./peers', () => ({
  hostnameOf: (value: string) => {
    try {
      return new URL(value).hostname;
    } catch {
      return null;
    }
  },
  pdsHostAllowed,
  canIngestFrom,
}));
const findProfile = vi.fn();
vi.mock('../profiles/finders', () => ({ findProfile }));
// Per-test overlay so a test can give the resolved profile fields the fixed
// constants lack (e.g. a stored pdsEndpoint for re-bind rejection).
let findProfileOverride: Record<string, unknown> = {};
const findProfileById = (id: string) =>
  id === 'remote-profile-id'
    ? { ...REMOTE_PROFILE, ...findProfileOverride }
    : id === 'subject-profile-id'
      ? SUBJECT_PROFILE
      : null;
const createPost = vi.fn();
const reactToPost = vi.fn();
const retractReaction = vi.fn();
const updatePost = vi.fn();
vi.mock('../posts/mutations', () => ({
  createPost,
  reactToPost,
  retractReaction,
  updatePost,
}));
const follow = vi.fn();
const unfollow = vi.fn();
vi.mock('../profiles/mutations', () => ({ follow, unfollow }));
const findPost = vi.fn();
vi.mock('../posts/finders', () => ({ findPost }));
const {
  ingestCommitOps,
  upsertRemoteAtActor,
  ingestLike,
  ingestFollow,
  findPostIdByAtUri,
} = await import('./ingest');

const REMOTE = 'did:plc:remote1';
const ACTOR = {
  did: REMOTE,
  handle: 'remote',
  pdsEndpoint: 'https://peer.example',
};
const LIKE_COLLECTION = 'app.bsky.feed.like';
const FOLLOW_COLLECTION = 'app.bsky.graph.follow';
const POST_URI = 'at://did:plc:remote1/app.bsky.feed.post/3aaaa';
// A full profiles row: `id` is what `findProfileByDid` projects, `did`/
// `deleted_at` satisfy the where-filtered probe for this actor.
const ACTOR_ROW = {
  id: 'remote-profile-id',
  did: REMOTE,
  deleted_at: null,
} as Record<string, unknown>;
const REMOTE_PROFILE = {
  id: 'remote-profile-id',
  did: REMOTE,
  handle: 'remote',
  atHandle: 'remote.peer.example',
  type: 'federated',
  deletedAt: null,
} as const;
const SUBJECT_PROFILE = {
  id: 'subject-profile-id',
  did: 'did:plc:subject1',
  handle: 'subject',
  atHandle: 'subject.peer.example',
  type: 'federated',
  deletedAt: null,
} as const;
const feedPostRecord = {
  $type: 'app.bsky.feed.post',
  text: 'hello from the firehose',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const resetState = () => {
  profilesRows.length = 0;
  postsRows.length = 0;
  atRecordsRows.length = 0;
  inserts.length = 0;
  updates.length = 0;
  findProfileOverride = {};
  vi.clearAllMocks();
  findProfile.mockImplementation(async (id: string) => findProfileById(id));
  findPost.mockResolvedValue(null);
  canIngestFrom.mockResolvedValue({ allowed: true });
  pdsHostAllowed.mockResolvedValue(true);
};

describe('ingestCommitOps (firehose data plane)', () => {
  beforeEach(resetState);

  it('drops every op when the PDS host is not allowlisted', async () => {
    pdsHostAllowed.mockResolvedValue(false);
    const result = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy',
          record: feedPostRecord,
        },
      ],
    });
    expect(result).toEqual([]);
    expect(createPost).not.toHaveBeenCalled();
  });

  it('ingests a feed post create and records its atUri/cid', async () => {
    // The actor is unknown (the where-filtered `did` probe matches nothing),
    // so the upsert mints the profile: existing-check, clash probe, readback.
    profilesRows.push([], [], [ACTOR_ROW]);
    postsRows.push([]); // findPostIdByAtUri (not ingested yet)
    createPost.mockResolvedValue({
      id: 'post-1',
      data: { content: feedPostRecord.text },
    });
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy-post',
          record: feedPostRecord,
        },
      ],
    });
    expect(ingested).toEqual([POST_URI]);
    expect(createPost).toHaveBeenCalledTimes(1);
    expect(createPost.mock.calls[0][0]).toMatchObject({
      type: 'note',
      content: feedPostRecord.text,
    });
    expect(createPost.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
    // The post row is stamped with the atUri + CID (the profiles insert is
    // the only non-UPDATE side effect).
    expect(updates[0].table).toBe('posts');
    expect(updates[0].set).toEqual({ atUri: POST_URI, cid: 'bafy-post' });
  });

  it('applies a remote post edit (update op) and refreshes the record CID', async () => {
    // The post was ingested earlier; the same URI re-delivers as an `update`
    // with new text and a changed CID (round-9 review item 1).
    findPost.mockResolvedValue({
      id: 'post-1',
      visibility: 'public',
      data: { content: 'original' },
    });
    profilesRows.push([ACTOR_ROW]); // lazy actor resolve (existing profile)
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    const edited = {
      $type: 'app.bsky.feed.post',
      text: 'edited through the firehose',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'update',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy-edited',
          record: edited,
        },
      ],
    });
    expect(ingested).toEqual([POST_URI]);
    // The edit is applied to the public post through the domain mutation
    // (which emits postUpdated, re-projecting the AT record)...
    expect(updatePost).toHaveBeenCalledTimes(1);
    expect(updatePost.mock.calls[0][0]).toMatchObject({ id: 'post-1' });
    expect(updatePost.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
    expect(updatePost.mock.calls[0][2]).toMatchObject({
      type: 'note',
      content: edited.text,
    });
    // ...and the posts row's CID is refreshed to the remote record identity.
    expect(
      updates.some((u) => u.table === 'posts' && u.set.cid === 'bafy-edited'),
    ).toBe(true);
  });

  it('does not apply a remote post edit when the stored post is not public', async () => {
    findPost.mockResolvedValue({
      id: 'post-1',
      visibility: 'private',
      data: { content: 'original' },
    });
    profilesRows.push([ACTOR_ROW]);
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    const edited = {
      $type: 'app.bsky.feed.post',
      text: 'should not apply',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'update',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy-edited',
          record: edited,
        },
      ],
    });
    expect(updatePost).not.toHaveBeenCalled();
    expect(
      updates.some((u) => u.table === 'posts' && u.set.cid === 'bafy-edited'),
    ).toBe(false);
  });

  it('re-delivering the same post create is a no-op (findPostIdByAtUri guard)', async () => {
    // A create replay routes through the update path, but the post is absent
    // (deleted) here, so the edit is a no-op and nothing is re-created.
    findPost.mockResolvedValue(null);
    profilesRows.push([ACTOR_ROW]);
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy-post',
          record: feedPostRecord,
        },
      ],
    });
    // The already-ingested uri is still reported, but nothing is re-created.
    expect(ingested).toEqual([POST_URI]);
    expect(createPost).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
    expect(inserts).toEqual([]);
  });

  it('applies a second post create for a DID that already has a profile', async () => {
    // The actor is already known (the where-filtered `did` probe matches the
    // row), so the upsert resolves the existing profile, not re-creates it.
    profilesRows.push([ACTOR_ROW]); // lazy actor resolve (existing)
    postsRows.push([]); // findPostIdByAtUri (not ingested yet)
    createPost.mockResolvedValue({
      id: 'post-2',
      data: { content: feedPostRecord.text },
    });
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.feed.post/3bbbc',
          cid: 'bafy-post2',
          record: feedPostRecord,
        },
      ],
    });
    expect(ingested).toEqual(['at://did:plc:remote1/app.bsky.feed.post/3bbbc']);
    expect(createPost).toHaveBeenCalledTimes(1);
    expect(createPost.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
    // No new profile row: the existing profile was resolved, not re-created.
    expect(inserts).toEqual([]);
    expect(updates[0].table).toBe('posts');
    expect(updates[0].set.atUri).toBe(
      'at://did:plc:remote1/app.bsky.feed.post/3bbbc',
    );
  });

  it('applies a remote app.bsky.actor.profile record to the upsert', async () => {
    // The actor is unknown; the profile record is the first op and must seed
    // displayName/description/avatar into the upsert (round-9 review item 3).
    profilesRows.push([], [], [ACTOR_ROW]); // upsert (existing, clash, readback)
    const profileRecord = {
      $type: 'app.bsky.actor.profile',
      displayName: 'Remote Human',
      description: 'synced from the firehose',
      avatar: 'at://did:plc:remote1/app.bsky.blob/av1',
    };
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.actor.profile/self',
          cid: 'bafy-profile',
          record: profileRecord,
        },
      ],
    });
    // Profile ops are identity ops — no post-like uri is reported.
    expect(ingested).toEqual([]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ did: REMOTE, type: 'federated' });
    expect(inserts[0].body).toMatchObject({
      displayName: 'Remote Human',
      bio: 'synced from the firehose',
      atAvatar: 'at://did:plc:remote1/app.bsky.blob/av1',
    });
  });

  it('ignores unknown collections and malformed paths', async () => {
    // `app.bsky.actor.profile` is now a handled collection, so use a truly
    // unknown collection + a malformed path.
    profilesRows.push([ACTOR_ROW]); // lazy actor resolve (harmless)
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.unknown.collection/self',
          cid: 'c',
          record: { $type: 'app.bsky.unknown.collection' },
        },
        { action: 'create', path: 'no-slash-here', cid: 'c', record: {} },
      ],
    });
    expect(ingested).toEqual([]);
    expect(updates).toEqual([]);
    expect(inserts).toEqual([]);
  });

  it('applies a like in an actor first commit after a post create mints the profile', async () => {
    // The actor is unknown at entry (no profiles row). The first op creates a
    // post — minting the profile — so the second op (a like) must still apply
    // via the lazy actor re-resolve (round-9 review item 2).
    // profiles: post-create upsert (existing, clash, readback), lazy actor
    // re-resolve, like upsert existing-check.
    profilesRows.push([], [], [ACTOR_ROW], [ACTOR_ROW], [ACTOR_ROW]);
    // posts: post create findPostIdByAtUri (none), like-subject lookup,
    // like upsert's own findPostIdByAtUri.
    postsRows.push([]);
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    // at_records: hasActiveIngestLike for (actor, post) — none active.
    atRecordsRows.push([]);
    createPost.mockResolvedValue({
      id: 'post-1',
      data: { content: feedPostRecord.text },
    });
    findPost.mockResolvedValue({ id: 'post-1' });
    reactToPost.mockResolvedValue(undefined);
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        {
          action: 'create',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy-post',
          record: feedPostRecord,
        },
        {
          action: 'create',
          path: 'app.bsky.feed.like/3like1',
          cid: 'bafy-like',
          record: {
            $type: LIKE_COLLECTION,
            subject: { uri: POST_URI },
          },
        },
      ],
    });
    expect(ingested).toEqual([POST_URI]);
    // The like applied despite the actor being unknown at batch entry: the
    // tracking row records (did, like, rkey) for the actor.
    expect(
      inserts.some(
        (row) =>
          row.collection === LIKE_COLLECTION &&
          row.rkey === '3like1' &&
          row.did === REMOTE &&
          row.postId === 'post-1',
      ),
    ).toBe(true);
    expect(reactToPost).toHaveBeenCalledTimes(1);
    expect(reactToPost.mock.calls[0][0]).toMatchObject({ id: 'post-1' });
  });

  it('retracts a like on delete by the applied (actor, post) pair', async () => {
    findPost.mockResolvedValue({ id: 'post-2' });
    profilesRows.push([ACTOR_ROW]); // lazy actor resolve -> actor present
    // The tracking row must match (did, like, rkey) AND be live; a row for
    // another rkey/DID would be filtered out (see the next test).
    atRecordsRows.push([
      {
        postId: 'post-2',
        post_id: 'post-2',
        did: REMOTE,
        collection: LIKE_COLLECTION,
        rkey: '3like1',
        deleted_at: null,
      },
    ]);
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [{ action: 'delete', path: 'app.bsky.feed.like/3like1' }],
    });
    expect(ingested).toEqual([]);
    // The tracked row was tombstoned before the reaction was retracted for
    // the applied (actor, post) pair.
    expect(updates[0].table).toBe('at_records');
    expect(updates[0].set.deletedAt).toBeTruthy();
    expect(retractReaction).toHaveBeenCalledTimes(1);
    expect(retractReaction.mock.calls[0][0]).toMatchObject({ id: 'post-2' });
    expect(retractReaction.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
  });

  it('does not retract a like when the tracking row is for another rkey (where filter)', async () => {
    findPost.mockResolvedValue({ id: 'post-2' });
    profilesRows.push([ACTOR_ROW]);
    // The only tracking row is keyed to a DIFFERENT rkey: the where-filtered
    // findIngestedLikePostByRkey must not return it, so no retraction.
    atRecordsRows.push([
      {
        postId: 'post-2',
        post_id: 'post-2',
        did: REMOTE,
        collection: LIKE_COLLECTION,
        rkey: '9other9',
        deleted_at: null,
      },
    ]);
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [{ action: 'delete', path: 'app.bsky.feed.like/3like1' }],
    });
    expect(ingested).toEqual([]);
    expect(retractReaction).not.toHaveBeenCalled();
    // The tombstone UPDATE for the queried (did, collection, rkey) is still
    // issued even though no live row matches it.
    expect(updates[0].table).toBe('at_records');
    expect(updates[0].set.deletedAt).toBeTruthy();
  });

  it('unfollows on a follow delete via the tracked (did, rkey) row', async () => {
    profilesRows.push([ACTOR_ROW]); // lazy actor resolve -> actor present
    atRecordsRows.push([
      {
        followId: 'subject-profile-id',
        follow_id: 'subject-profile-id',
        did: REMOTE,
        collection: FOLLOW_COLLECTION,
        rkey: '3follow1',
        deleted_at: null,
      },
    ]);
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [{ action: 'delete', path: 'app.bsky.graph.follow/3follow1' }],
    });
    expect(ingested).toEqual([]);
    expect(updates[0].table).toBe('at_records');
    expect(unfollow).toHaveBeenCalledTimes(1);
    expect(unfollow.mock.calls[0][0]).toMatchObject({
      id: 'remote-profile-id',
    });
    expect(unfollow.mock.calls[0][1]).toMatchObject({
      id: 'subject-profile-id',
    });
  });

  it('soft-deletes a post on a post delete', async () => {
    postsRows.push([{ id: 'post-9', at_uri: POST_URI, deleted_at: null }]);
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [{ action: 'delete', path: 'app.bsky.feed.post/3aaaa' }],
    });
    expect(ingested).toEqual([POST_URI]);
    // Soft-delete the post and clear its atUri/cid so a replayed create for
    // the same (did, rkey) cannot collide on the unique posts_at_uri index.
    expect(updates[0].table).toBe('posts');
    expect(updates[0].set.deletedAt).toBeTruthy();
    expect(updates[0].set.atUri).toBeNull();
    expect(updates[0].set.cid).toBeNull();
    expect(updates[1].table).toBe('at_records');
    expect(updates[1].set.deletedAt).toBeTruthy();
  });

  it('applies a delete then recreate of the same rkey', async () => {
    // Delete: the post is found by atUri; recreate: the actor is known.
    profilesRows.push([ACTOR_ROW]); // recreate upsert existing-check
    postsRows.push([{ id: 'post-9', at_uri: POST_URI, deleted_at: null }]); // delete
    postsRows.push([]); // recreate findPostIdByAtUri (tombstone gone)
    createPost.mockResolvedValue({
      id: 'post-10',
      data: { content: feedPostRecord.text },
    });
    const ingested = await ingestCommitOps({
      did: REMOTE,
      pdsEndpoint: ACTOR.pdsEndpoint,
      handle: 'remote',
      ops: [
        { action: 'delete', path: 'app.bsky.feed.post/3aaaa' },
        {
          action: 'create',
          path: 'app.bsky.feed.post/3aaaa',
          cid: 'bafy-recreated',
          record: feedPostRecord,
        },
      ],
    });
    // The delete tombstones the post (reporting the uri) and the recreate
    // lands a fresh post for the same (did, rkey) — the atUri/cid the delete
    // cleared — so the uri is reported by both ops.
    expect(ingested).toEqual([POST_URI, POST_URI]);
    expect(createPost).toHaveBeenCalledTimes(1);
    expect(createPost.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
    expect(updates[0].table).toBe('posts');
    expect(updates[0].set.deletedAt).toBeTruthy();
    expect(updates[0].set.atUri).toBeNull();
    expect(updates[1].table).toBe('at_records');
    expect(updates[1].set.deletedAt).toBeTruthy();
    expect(updates[2].table).toBe('posts');
    expect(updates[2].set.atUri).toBe(POST_URI);
    expect(updates[2].set.cid).toBe('bafy-recreated');
  });
});

describe('ingestLike / ingestFollow (first-seen firehose apply)', () => {
  beforeEach(resetState);

  it('applies a like: creates the actor, reacts, and tracks the rkey', async () => {
    findPost.mockResolvedValue({ id: 'post-1' });
    reactToPost.mockResolvedValue(undefined);
    // Actor unknown -> upsert mints it (existing, clash, readback).
    profilesRows.push([], [], [ACTOR_ROW]);
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    const postId = await ingestLike({
      actor: ACTOR,
      subjectUri: POST_URI,
      likeRkey: '3like1',
    });
    expect(postId).toBe('post-1');
    expect(reactToPost).toHaveBeenCalledTimes(1);
    expect(reactToPost.mock.calls[0][0]).toMatchObject({ id: 'post-1' });
    expect(reactToPost.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
    expect(
      inserts.some(
        (row) => row.collection === LIKE_COLLECTION && row.rkey === '3like1',
      ),
    ).toBe(true);
  });

  it('drops a like when the subject post is not present', async () => {
    // Existing profile resolves (no insert); the subject lookup finds none.
    profilesRows.push([ACTOR_ROW]);
    postsRows.push([]);
    const result = await ingestLike({
      actor: ACTOR,
      subjectUri: POST_URI,
      likeRkey: '3like1',
    });
    expect(result).toBeNull();
    expect(reactToPost).not.toHaveBeenCalled();
  });

  it('applies a like for a DID that already has a profile (second op)', async () => {
    findPost.mockResolvedValue({ id: 'post-1' });
    profilesRows.push([ACTOR_ROW]); // upsert existing check (found)
    postsRows.push([{ id: 'post-1', at_uri: POST_URI, deleted_at: null }]);
    const postId = await ingestLike({
      actor: ACTOR,
      subjectUri: POST_URI,
      likeRkey: '3like1',
    });
    expect(postId).toBe('post-1');
    expect(reactToPost).toHaveBeenCalledTimes(1);
    expect(reactToPost.mock.calls[0][1]).toMatchObject({
      id: 'remote-profile-id',
    });
    // The profile was resolved, not re-created.
    expect(inserts.filter((row) => row.type === 'federated')).toEqual([]);
  });

  it('applies a follow: creates the actor, follows, and tracks the rkey', async () => {
    // Actor unknown -> upsert mints it; the subject DID probe finds its row.
    profilesRows.push([], [], [ACTOR_ROW]); // upsert (existing, clash, readback)
    profilesRows.push([
      { id: 'subject-profile-id', did: 'did:plc:subject1', deleted_at: null },
    ]); // subject DID lookup
    const result = await ingestFollow({
      actorDid: REMOTE,
      subjectDid: SUBJECT_PROFILE.did,
      actor: ACTOR,
      followRkey: '3follow1',
    });
    expect(result).toBe('remote-profile-id');
    expect(follow).toHaveBeenCalledTimes(1);
    expect(follow.mock.calls[0][0]).toMatchObject({ id: 'remote-profile-id' });
    expect(
      inserts.some(
        (row) =>
          row.collection === FOLLOW_COLLECTION && row.rkey === '3follow1',
      ),
    ).toBe(true);
  });

  it('applies a follow for a DID that already has a profile (second op)', async () => {
    profilesRows.push([ACTOR_ROW]); // upsert existing check (found)
    profilesRows.push([
      { id: 'subject-profile-id', did: 'did:plc:subject1', deleted_at: null },
    ]); // subject DID lookup
    const result = await ingestFollow({
      actorDid: REMOTE,
      subjectDid: SUBJECT_PROFILE.did,
      actor: ACTOR,
      followRkey: '3follow1',
    });
    expect(result).toBe('remote-profile-id');
    expect(follow).toHaveBeenCalledTimes(1);
    expect(follow.mock.calls[0][0]).toMatchObject({ id: 'remote-profile-id' });
    expect(inserts.filter((row) => row.type === 'federated')).toEqual([]);
  });
});

describe('upsertRemoteAtActor (guard + handle collision retry)', () => {
  beforeEach(resetState);

  it('inserts a new federated profile for an unseen DID', async () => {
    profilesRows.push([], [], [ACTOR_ROW]); // existing, clash, readback
    const actor = await upsertRemoteAtActor(ACTOR);
    expect(actor).toMatchObject({ id: 'remote-profile-id' });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      handle: 'remote',
      did: REMOTE,
      type: 'federated',
    });
  });

  it('stores displayName/bio/avatar on a freshly ingested profile record', async () => {
    profilesRows.push([], [], [ACTOR_ROW]); // existing, clash, readback
    const actor = await upsertRemoteAtActor({
      ...ACTOR,
      displayName: 'Remote Human',
      bio: 'synced from the firehose',
      avatar: 'at://did:plc:remote1/app.bsky.feed.post/avatar1',
    });
    expect(actor).toMatchObject({ id: 'remote-profile-id' });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].body).toMatchObject({
      displayName: 'Remote Human',
      bio: 'synced from the firehose',
      atAvatar: 'at://did:plc:remote1/app.bsky.feed.post/avatar1',
    });
  });

  it('derives a suffixed handle on a collision instead of failing', async () => {
    profilesRows.push([]); // existing check (none)
    profilesRows.push([
      {
        id: 'existing',
        handle: 'remote',
        at_handle: 'remote.peer.example',
        activity_pub_domain: 'peer.example',
        deleted_at: null,
      },
    ]); // first clash probe (clash)
    profilesRows.push([]); // suffixed probe (none)
    profilesRows.push([ACTOR_ROW]); // readback
    const actor = await upsertRemoteAtActor(ACTOR);
    expect(actor).toMatchObject({ id: 'remote-profile-id' });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].handle).toMatch(/^remote-[0-9a-f]{6}$/);
    expect(inserts[0].atHandle).toMatch(/^remote-[0-9a-f]{6}\.peer\.example$/);
  });

  it('rejects ingest when the ingest guard denies the source', async () => {
    canIngestFrom.mockResolvedValue({ allowed: false, reason: 'pds mismatch' });
    const actor = await upsertRemoteAtActor(ACTOR);
    expect(actor).toBeUndefined();
    expect(inserts).toHaveLength(0);
  });

  it('resolves an existing profile when the same DID re-presents itself', async () => {
    profilesRows.push([ACTOR_ROW]); // existing check -> found
    const actor = await upsertRemoteAtActor(ACTOR);
    expect(actor).toMatchObject({ id: 'remote-profile-id' });
    // No new profile row: the existing profile was resolved, not re-created.
    expect(inserts).toHaveLength(0);
  });

  it('rejects a genuine re-bind: the same DID claiming a different PDS', async () => {
    profilesRows.push([ACTOR_ROW]); // existing check -> found
    findProfileOverride = { pdsEndpoint: 'https://other.example' };
    const actor = await upsertRemoteAtActor(ACTOR);
    expect(actor).toBeUndefined();
    expect(inserts).toHaveLength(0);
  });
});

describe('findPostIdByAtUri', () => {
  beforeEach(resetState);

  it('returns null when no live post maps to the atUri', async () => {
    postsRows.push([]);
    expect(
      await findPostIdByAtUri('at://did:plc:x/app.bsky.feed.post/3z'),
    ).toBeNull();
  });

  it('returns the post id when a live post maps to the atUri', async () => {
    postsRows.push([
      {
        id: 'post-7',
        at_uri: 'at://did:plc:x/app.bsky.feed.post/3z',
        deleted_at: null,
      },
    ]);
    expect(
      await findPostIdByAtUri('at://did:plc:x/app.bsky.feed.post/3z'),
    ).toBe('post-7');
  });
});
