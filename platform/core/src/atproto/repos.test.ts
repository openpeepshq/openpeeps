import { beforeEach, describe, expect, it, vi } from 'vitest';
import { and, gt, isNull, or } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { atRepoCommits, profiles } from '../db/pg/schema/documents';
import { atUriFor, COLLECTIONS } from './records';
import { isLocalProfileActive, loadLocalAtprotoIdentity } from './identity';
import {
  describeRepo,
  getLatestCommit,
  getRecord,
  getRepoCarStream,
  getRepoSnapshot,
  listLocalRepoCommits,
  listRecords,
  listRepos,
  serializeByKey,
} from './repos';

// Shape-agnostic pg mock: each drizzle chain's terminal `limit()` resolves the
// next queued row set (an array, like a real drizzle select), so a function
// issuing one or two queries just consumes the queue in order. `limits`
// records the value each `limit()` received so the SQL-side clamp is
// assertable (a negative limit would reach PG as `LIMIT -1`).
const rows: Array<unknown> = [];
const limits: number[] = [];
// The condition each chain's `where()` received, so a test can render it
// to SQL (PgDialect) and assert on the predicate the query actually runs.
const wheres: unknown[] = [];
vi.mock('../db/pg/client', () => {
  const builder = {
    from: () => builder,
    where: (w: unknown) => {
      wheres.push(w);
      return {
        ...builder,
        // Chains without a terminal .limit() (listRecords' in-memory
        // visibility gate) resolve on the where() result instead.
        then: (resolve: (value: unknown) => void) => {
          resolve(rows.shift());
        },
      };
    },
    orderBy: () => builder,
    join: () => builder,
    leftJoin: () => builder,
    selectDistinctOn: () => builder,
    limit: (n: number) => {
      limits.push(n);
      return Promise.resolve(rows.shift());
    },
  };
  return {
    pgDb: () => ({ select: () => builder, selectDistinctOn: () => builder }),
  };
});
vi.mock('./identity', () => ({
  loadLocalAtprotoIdentity: vi.fn(),
  isLocalProfileActive: vi.fn(),
}));

const identity = {
  id: 'p1',
  handle: 'alice',
  did: 'did:web:community.example:atproto:users:alice',
  atHandle: 'alice.community.example',
  publicKeyDid: 'did:key:z',
  privateKey: 'base64',
};

const recordRow = {
  id: 'r1',
  did: identity.did,
  collection: COLLECTIONS.post,
  rkey: '3abc',
  cid: 'bafy-post',
  record: { text: 'hi' },
  postId: 'post-1',
};

describe('atproto repos (read paths)', () => {
  beforeEach(() => {
    rows.length = 0;
    limits.length = 0;
    vi.mocked(loadLocalAtprotoIdentity).mockReset();
    vi.mocked(loadLocalAtprotoIdentity).mockResolvedValue(identity as never);
  });
  it('getRecord returns the live record for a public note', async () => {
    rows.push([recordRow], [{ visibility: 'public', deletedAt: null }]);
    const rec = await getRecord('alice', COLLECTIONS.post, '3abc');
    expect(rec).toEqual({
      uri: atUriFor(identity.did, COLLECTIONS.post, '3abc'),
      cid: 'bafy-post',
      value: { text: 'hi' },
    });
  });

  it('getRecord hides a record whose note is no longer public', async () => {
    for (const post of [
      { visibility: 'local', deletedAt: null },
      { visibility: 'public', deletedAt: '2026-01-01T00:00:00Z' },
    ]) {
      rows.push([recordRow], [post]);
      await expect(
        getRecord('alice', COLLECTIONS.post, '3abc'),
      ).resolves.toBeNull();
    }
  });
});

describe('serializeByKey', () => {
  it('runs same-key jobs in submission order while different keys overlap', async () => {
    const chains = new Map<string, Promise<void>>();
    const order: string[] = [];
    const start = (label: string, ms: number) => () =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          order.push(label);
          resolve();
        }, ms),
      );

    // A1 is slow (30ms); B1 (5ms) and A2 (1ms) are fast. B must finish before
    // A does (no global serialization), but A2 must wait for A1 (per-DID order).
    const pA1 = serializeByKey(chains, 'A', start('A1', 30));
    const pB1 = serializeByKey(chains, 'B', start('B1', 5));
    const pA2 = serializeByKey(chains, 'A', start('A2', 1));
    await Promise.all([pA1, pB1, pA2]);

    expect(order.indexOf('A1')).toBeLessThan(order.indexOf('A2'));
    // B1 completed while A1 was still running -> cross-DID concurrency.
    expect(order.indexOf('B1')).toBeLessThan(order.indexOf('A2'));
  });
});

describe('listRepos', () => {
  it('returns one row per DID with a cursor for the next page', async () => {
    rows.push([
      { did: 'did:plc:1', rev: 'r1', commitCid: 'c1', createdAt: '2026-01-01' },
      { did: 'did:plc:2', rev: 'r2', commitCid: 'c2', createdAt: '2026-01-02' },
    ]);
    const { repos, cursor } = await listRepos(50);
    expect(repos).toEqual([
      { did: 'did:plc:1', head: 'c1', rev: 'r1' },
      { did: 'did:plc:2', head: 'c2', rev: 'r2' },
    ]);
    expect(cursor).toBe('did:plc:2');
  });
});

describe('listRecords pagination (com.atproto.repo.listRecords cursor contract)', () => {
  const postRow = (rkey: string, postId: string | null) => ({
    id: `rec-${rkey}`,
    did: identity.did,
    collection: COLLECTIONS.post,
    rkey,
    cid: `bafy-${rkey}`,
    record: { text: rkey },
    postId,
  });

  beforeEach(() => {
    rows.length = 0;
    limits.length = 0;
    wheres.length = 0;
    vi.mocked(loadLocalAtprotoIdentity).mockReset();
    vi.mocked(loadLocalAtprotoIdentity).mockResolvedValue(identity as never);
  });

  it('pages through more records than one limit, each exactly once in rkey-descending order', async () => {
    const all = ['k5', 'k4', 'k3', 'k2', 'k1'];
    // Two pages of limit 2 over five records; each queue pair is the paging
    // query's rows followed by the in-memory visibility gate's post rows.
    rows.push(
      [postRow('k5', 'p-k5'), postRow('k4', 'p-k4')],
      [
        { id: 'p-k5', visibility: 'public', deletedAt: null },
        { id: 'p-k4', visibility: 'public', deletedAt: null },
      ],
      [postRow('k3', 'p-k3'), postRow('k2', 'p-k2')],
      [
        { id: 'p-k3', visibility: 'public', deletedAt: null },
        { id: 'p-k2', visibility: 'public', deletedAt: null },
      ],
    );

    const page1 = await listRecords('alice', COLLECTIONS.post, 2);
    expect(page1.records.map((r) => r.uri)).toEqual(
      all.slice(0, 2).map((k) => atUriFor(identity.did, COLLECTIONS.post, k)),
    );
    expect(page1.cursor).toBe('k4');

    const page2 = await listRecords('alice', COLLECTIONS.post, 2, page1.cursor);
    expect(page2.records.map((r) => r.uri)).toEqual(
      all.slice(2, 4).map((k) => atUriFor(identity.did, COLLECTIONS.post, k)),
    );
    expect(page2.cursor).toBe('k2');

    // Across the pages every record appeared exactly once, descending.
    const seen = [...page1.records, ...page2.records].map((r) => r.uri);
    expect(seen).toEqual(
      all.slice(0, 4).map((k) => atUriFor(identity.did, COLLECTIONS.post, k)),
    );
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('returns cursor: undefined on the final (empty) page', async () => {
    rows.push([]);
    const last = await listRecords('alice', COLLECTIONS.post, 1, 'k5');
    expect(last.records).toEqual([]);
    expect(last.cursor).toBeUndefined();
  });

  it('advances past a record hidden by the live-visibility gate without stalling or resurfacing it', async () => {
    // Page 1: k5 is hidden (private), k4 visible. Hidden records still
    // consume a SQL limit slot, so the page returns fewer records than the
    // limit while the cursor advances past the hidden record. The gate
    // slot below is the gate query's SQL-side result: only the live,
    // public posts come back (its WHERE filters visibility).
    rows.push(
      [postRow('k5', 'p-k5'), postRow('k4', 'p-k4')],
      [{ id: 'p-k4', visibility: 'public', deletedAt: null }],
    );
    const page1 = await listRecords('alice', COLLECTIONS.post, 2);
    expect(page1.records.map((r) => r.cid)).toEqual(['bafy-k4']);
    expect(page1.cursor).toBe('k4');

    // Page 2 continues strictly after the cursor: the hidden record cannot
    // stall the walk or resurface in a later page.
    rows.push(
      [postRow('k3', 'p-k3')],
      [{ id: 'p-k3', visibility: 'public', deletedAt: null }],
    );
    const page2 = await listRecords('alice', COLLECTIONS.post, 2, page1.cursor);
    expect(page2.records.map((r) => r.cid)).toEqual(['bafy-k3']);
    expect(page2.records).not.toContainEqual(
      expect.objectContaining({ cid: 'bafy-k5' }),
    );
    // The cursor window excludes the hidden rkey in SQL, not in JS: the
    // second paging query carries the strictly-decreasing rkey predicate.
    const rendered = new PgDialect().sqlToQuery(wheres.at(-2)! as never).sql;
    expect(rendered).toContain('"at_records"."rkey" <');
  });
});

describe('negative limit guard (client-supplied ?limit=-N must not reach PG)', () => {
  beforeEach(() => {
    rows.length = 0;
    limits.length = 0;
    vi.mocked(loadLocalAtprotoIdentity).mockReset();
    vi.mocked(loadLocalAtprotoIdentity).mockResolvedValue(identity as never);
  });

  it('listRecords clamps a negative limit to 1', async () => {
    // postId is null so the live-visibility gate is skipped and only the
    // single paging query (the one that carries the limit) runs.
    rows.push([
      {
        did: identity.did,
        collection: COLLECTIONS.post,
        rkey: '3abc',
        cid: 'bafy-post',
        record: { text: 'hi' },
        postId: null,
      },
    ]);
    await listRecords('alice', COLLECTIONS.post, -1);
    expect(limits).toEqual([1]);
  });

  it('listRepos clamps a negative limit to 1', async () => {
    rows.push([]);
    await listRepos(-5);
    expect(limits).toEqual([1]);
  });
});

// Round-14 review: a soft-deleted local profile must not stay readable on the
// DID-keyed sync surface. `loadLocalAtprotoIdentity` only matches live
// profiles, so these paths fall back to a raw DID and gate on
// `isLocalProfileActive` instead.
describe('deleted local profile (DID-keyed sync surface)', () => {
  const deletedDid = 'did:web:community.example:atproto:users:bob';

  beforeEach(() => {
    rows.length = 0;
    limits.length = 0;
    wheres.length = 0;
    vi.mocked(loadLocalAtprotoIdentity).mockReset();
    vi.mocked(loadLocalAtprotoIdentity).mockResolvedValue(null);
    vi.mocked(isLocalProfileActive).mockReset();
    vi.mocked(isLocalProfileActive).mockResolvedValue(false);
  });

  it('getRecord no longer serves a deleted profile repo by DID', async () => {
    await expect(
      getRecord(deletedDid, COLLECTIONS.post, '3abc'),
    ).resolves.toBeNull();
  });

  it('listRecords no longer serves a deleted profile repo by DID', async () => {
    await expect(listRecords(deletedDid, COLLECTIONS.post)).resolves.toEqual({
      records: [],
      cursor: undefined,
    });
  });

  it('describeRepo no longer describes a deleted profile repo by DID', async () => {
    await expect(describeRepo(deletedDid)).resolves.toBeNull();
  });

  it('getRepoCarStream does not stream a deleted profile repo', async () => {
    await expect(getRepoCarStream(deletedDid)).resolves.toBeNull();
  });

  it('getLatestCommit reports a deleted profile repo as unknown', async () => {
    await expect(getLatestCommit(deletedDid)).resolves.toBeNull();
  });

  it('a live local profile repo stays readable on the same paths', async () => {
    vi.mocked(isLocalProfileActive).mockResolvedValue(true);
    const liveDid = 'did:web:community.example:atproto:users:carol';
    rows.push([{ id: 'c1', rev: 'r1', commitCid: 'c1' }]);
    const commit = await getLatestCommit(liveDid);
    expect(commit).toEqual({ cid: 'c1', rev: 'r1' });
  });

  // Round-15: the exclusion of a deleted profile's commits is the SQL join
  // itself (leftJoin + predicate), not JS filtering — render the captured
  // where-condition to SQL and pin the predicate, since the mocked builder
  // cannot execute the join.
  it('listLocalRepoCommits excludes deleted local profiles in the SQL join', async () => {
    rows.push([]);
    await listLocalRepoCommits('cursor-1');
    expect(wheres).toHaveLength(1);
    const rendered = new PgDialect().sqlToQuery(
      and(
        gt(atRepoCommits.id, 'cursor-1'),
        or(isNull(profiles.did), isNull(profiles.deletedAt)),
      ),
    ).sql;
    // The rendered string is the expected shape of the predicate; the
    // captured condition must render identically (same join, same filter).
    expect(new PgDialect().sqlToQuery(wheres[0] as never).sql).toBe(rendered);
    expect(rendered).toContain('"profiles"."did" is null');
    expect(rendered).toContain('"profiles"."deleted_at" is null');
  });

  it('listLocalRepoCommits without a cursor still carries the join exclusion', async () => {
    rows.push([]);
    await listLocalRepoCommits(null);
    expect(wheres).toHaveLength(1);
    const rendered = new PgDialect().sqlToQuery(wheres[0] as never).sql;
    expect(rendered).toContain('"profiles"."did" is null');
    expect(rendered).toContain('"profiles"."deleted_at" is null');
    expect(rendered).not.toContain('at_repo_commits');
  });

  // Round-15: the gate now lives in the helper itself, so a deleted profile's
  // head cannot leak through any read path (current or future).
  it('getRepoSnapshot returns null for a deleted local profile', async () => {
    await expect(getRepoSnapshot(deletedDid)).resolves.toBeNull();
    expect(rows).toHaveLength(0);
  });

  it('getRepoSnapshot still returns the head row for a live local profile', async () => {
    vi.mocked(isLocalProfileActive).mockResolvedValue(true);
    const liveDid = 'did:web:community.example:atproto:users:carol';
    rows.push([
      {
        id: 'c1',
        did: liveDid,
        rev: 'r1',
        commitCid: 'c1',
        prev: null,
        car: new Uint8Array([1, 2]),
        snapshot: {},
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    const row = await getRepoSnapshot(liveDid);
    expect(row?.commitCid).toBe('c1');
  });
});
