import { beforeEach, describe, expect, it, vi } from 'vitest';

// AppView read paths. These tests pin two contracts the prior rounds left
// untested:
//   1. getPostThread resolves replies through the replyTo edge (reply post ->
//      parent post). Replies are stored with their parent's *local post id*
//      (every creation path funnels through createPost, which writes a
//      replyTo edge), never with the parent's at:// uri — so matching
//      posts.inReplyToUri against an at:// uri could never match and the
//      thread always came back empty.
//   2. getAuthorFeed clamps a client-supplied limit the same way
//      listLocalRepoCommits does: Math.min(Math.max(limit, 1), 100). A
//      negative limit must not reach PG as `LIMIT -1`.
//
// The pg client is mocked with a predicate-introspecting builder: each
// drizzle chain's terminal `limit()` resolves the row set for the table the
// `where` clause references (disambiguated by the PG column names it names),
// filtered by the `col = value` / `col IS NULL` constraints it carries.
// `limits` records every limit() value so the SQL-side clamp is assertable.

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

// Row fixtures carry the PG column names for the columns the `where` clauses
// filter on (so rowMatches can apply them) AND the camelCase keys the code
// projects back out (atUri, cid, fromId, ...). Both forms are needed because
// the mock returns the raw row for a real drizzle select that would project
// camelCase keys.
const profileRow = {
  // filter: did = <did>, deleted_at is null
  did: 'did:web:community.example:atproto:users:alice',
  deleted_at: null,
  // projection: did, handle, atHandle, body
  handle: 'alice',
  atHandle: 'alice.community.example',
  body: {
    displayName: 'Alice',
    discoverable: true,
    indexable: true,
    hideSocialGraph: false,
  },
} as Record<string, unknown>;
const rootPostRow = {
  // filter: at_uri = ROOT_URI, deleted_at is null
  at_uri: 'at://did:web:community.example/app.bsky.feed.post/3root',
  deleted_at: null,
  // projection: id, atUri, cid, visibility
  id: 'post-root',
  atUri: 'at://did:web:community.example/app.bsky.feed.post/3root',
  cid: 'bafy-root',
  visibility: 'public',
} as Record<string, unknown>;
const replyPostRow = {
  // filter: id in [...], deleted_at is null
  id: 'post-reply',
  deleted_at: null,
  // projection: atUri, cid, visibility
  atUri: 'at://did:web:community.example/app.bsky.feed.post/3reply',
  cid: 'bafy-reply',
  visibility: 'public',
} as Record<string, unknown>;
const replyToRow = {
  // filter: to_id = root.id
  to_id: 'post-root',
  // projection: fromId
  fromId: 'post-reply',
} as Record<string, unknown>;

const profileRows: Array<Record<string, unknown>[]> = [];
const postRows: Array<Record<string, unknown>[]> = [];
const replyToRows: Array<Record<string, unknown>[]> = [];
const atRecordRows: Array<Record<string, unknown>[]> = [];
const limits: number[] = [];

// Decide which fixture table a `where` clause targets from the PG column
// names it references (the tables share no column names in this code path:
// posts uses at_uri, reply_to uses to_id, at_records uses post_id, profiles
// uses did).
const tableFor = (pred: unknown): string | null => {
  const cols = predicateTokens(pred)
    .map((t) => t.col)
    .filter((c): c is string => c !== undefined);
  if (cols.includes('to_id')) return 'reply_to';
  if (cols.includes('post_id')) return 'at_records';
  if (cols.includes('did')) return 'profiles';
  if (cols.some((c) => ['at_uri', 'creator_id'].includes(c))) return 'posts';
  return null;
};
const makeSelect = () => {
  let wherePred: unknown = null;
  const resolveRows = (): Promise<Record<string, unknown>[]> => {
    if (wherePred === null) return Promise.resolve([]);
    const table = tableFor(wherePred) ?? 'posts';
    const queue =
      table === 'profiles'
        ? profileRows
        : table === 'reply_to'
          ? replyToRows
          : table === 'at_records'
            ? atRecordRows
            : postRows;
    const rows = queue.length ? (queue.shift() ?? []) : [];
    return Promise.resolve(rows.filter((row) => rowMatches(row, wherePred)));
  };
  const builder = {
    from: () => builder,
    innerJoin: () => builder,
    where: (pred: unknown) => {
      wherePred = pred;
      return builder;
    },
    orderBy: () => builder,
    limit: (n?: number) => {
      if (n !== undefined) limits.push(n);
      return resolveRows();
    },
    // A drizzle select is awaitable even without a terminal `limit()`: the
    // reply_to edge query in getPostThread resolves without one.
    then: (
      res: (v: Record<string, unknown>[]) => unknown,
      rej?: (e: unknown) => unknown,
    ) => resolveRows().then(res, rej),
  };
  return builder;
};

vi.mock('../db/pg/client', () => ({
  pgDb: () => ({
    select: () => makeSelect(),
    selectDistinctOn: () => makeSelect(),
  }),
}));

// The AppView only needs findProfileByDid from ingest (actor resolution).
// Stub the whole module so its transitive imports (posts/mutations, etc.)
// never load.
const findProfileByDid = vi.fn();
vi.mock('./ingest', () => ({ findProfileByDid }));

const { getPostThread, getAuthorFeed } = await import('./appview');

const ACTOR_DID = 'did:web:community.example:atproto:users:alice';
const ROOT_URI = 'at://did:web:community.example/app.bsky.feed.post/3root';
const REPLY_URI = 'at://did:web:community.example/app.bsky.feed.post/3reply';

const resetState = () => {
  profileRows.length = 0;
  postRows.length = 0;
  replyToRows.length = 0;
  atRecordRows.length = 0;
  limits.length = 0;
  vi.clearAllMocks();
  findProfileByDid.mockResolvedValue({
    id: 'prof-1',
    did: ACTOR_DID,
    handle: 'alice',
    atHandle: 'alice.community.example',
  } as never);
};

beforeEach(resetState);

describe('getPostThread (replies via replyTo edge)', () => {
  it('returns replies whose replyTo edge points at the root post', async () => {
    profileRows.push([profileRow]);
    // root lookup (posts, at_uri = ROOT_URI)
    postRows.push([rootPostRow]);
    // replyTo edge lookup (to_id = root id)
    replyToRows.push([replyToRow]);
    // reply post lookup (posts, in_array id)
    postRows.push([replyPostRow]);

    const thread = await getPostThread(ROOT_URI);
    expect(thread).toEqual({
      thread: {
        post: { uri: ROOT_URI, cid: 'bafy-root' },
        replies: [{ post: { uri: REPLY_URI, cid: 'bafy-reply' } }],
      },
    });
  });

  it('returns an empty thread when no replyTo edge points at the root', async () => {
    profileRows.push([profileRow]);
    postRows.push([rootPostRow]);
    replyToRows.push([]);

    const thread = await getPostThread(ROOT_URI);
    expect(thread).toEqual({
      thread: {
        post: { uri: ROOT_URI, cid: 'bafy-root' },
        replies: [],
      },
    });
  });

  it('returns null for a non-public root', async () => {
    profileRows.push([profileRow]);
    postRows.push([{ ...rootPostRow, visibility: 'local' }]);
    const thread = await getPostThread(ROOT_URI);
    expect(thread).toBeNull();
  });
});

describe('getAuthorFeed (limit clamp)', () => {
  it('clamps a negative limit to 1 before it reaches PG', async () => {
    // Profile resolution (profiles, did) + feed (posts join at_records).
    profileRows.push([profileRow]);
    postRows.push([]);
    atRecordRows.push([]);
    await getAuthorFeed(ACTOR_DID, -1);
    // profileView records its own `.limit(1)`; the feed query is the last one
    // to run. Under the old `Math.min(limit, 100)` a -1 limit reached PG as
    // `LIMIT -1`; the clamp lower bound makes it 1.
    expect(limits.at(-1)).toBe(1);
    expect(limits.every((n) => n >= 1)).toBe(true);
  });
});
