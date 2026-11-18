import { beforeEach, describe, expect, it, vi } from 'vitest';
import { atUriFor, COLLECTIONS } from './records';
import { loadLocalAtprotoIdentity } from './identity';
import { getRecord, listRepos, serializeByKey } from './repos';

// Shape-agnostic pg mock: each drizzle chain's terminal `limit()` resolves the
// next queued row set (an array, like a real drizzle select), so a function
// issuing one or two queries just consumes the queue in order.
const rows: Array<unknown> = [];
vi.mock('../db/pg/client', () => {
  const builder = {
    from: () => builder,
    where: () => builder,
    orderBy: () => builder,
    selectDistinctOn: () => builder,
    limit: () => Promise.resolve(rows.shift()),
  };
  return {
    pgDb: () => ({ select: () => builder, selectDistinctOn: () => builder }),
  };
});
vi.mock('./identity', () => ({ loadLocalAtprotoIdentity: vi.fn() }));

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
