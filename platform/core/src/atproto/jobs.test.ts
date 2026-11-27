import { beforeEach, describe, expect, it, vi } from 'vitest';

// Per-op firehose job keying (round 11 finding). The firehose emits one Event
// per op of a commit, so every enqueue carries exactly one op. BullMQ treats
// a repeated jobId as a duplicate — the existing job wins, the new one is
// silently dropped — so a jobId of `${did}:${rev}` would drop every op of a
// multi-op commit except the first (a post+like commit would ingest only the
// post). The key must therefore include the op path:
// `${did}:${rev}:${ops[0].path}`.
//
// Two contracts are pinned here:
//   1. enqueueAtprotoIngest keys jobs per op (two ops of the same commit ->
//      two distinct jobIds, each still dedup-safe when enqueued twice).
//   2. the firehose handleEvent maps an Event to a single-op job whose
//      path is `${collection}/${rkey}` (the source of the dedup key) and
//      whose rev is the commit revision string.

let addJob: (
  name: string,
  data: unknown,
  opts: Record<string, unknown>,
) => Promise<void>;
const firehoseInstances: Array<Record<string, unknown>> = [];

vi.mock('../jobs', () => ({
  queueAndWorker: () => [
    () => ({ add: addJob }),
    () => ({ on: () => {}, close: async () => undefined }),
  ],
}));
vi.mock('./peers', () => ({
  atprotoIngestEnabled: async () => true,
  pdsHostAllowed: async () => true,
}));
vi.mock('./ingest', () => ({ ingestCommitOps: async () => [] }));
vi.mock('./handleDns', () => ({
  handleDnsConfigured: async () => false,
  publishHandleTxt: async () => null,
}));
vi.mock('../config', () => ({
  config: async () => ({
    atproto: {
      plcDirectory: 'https://plc.directory',
      allowedPdsHosts: ['pds.example'],
    },
  }),
}));
vi.mock('../db/pg/client', () => ({ pgDb: () => ({}) }));
vi.mock('@atproto/sync', () => ({
  Firehose: class Firehose {
    constructor(opts: { handleEvent: (evt: unknown) => Promise<void> }) {
      firehoseInstances.push(opts);
    }
    start = (): void => undefined;
    destroy = async (): Promise<void> => undefined;
  },
}));
vi.mock('@atproto/identity', () => ({ IdResolver: class IdResolver {} }));

const { enqueueAtprotoIngest, startAllowlistedIngest } = await import('./jobs');

const enqueueOpts: Array<Record<string, unknown>> = [];
beforeEach(() => {
  enqueueOpts.length = 0;
  firehoseInstances.length = 0;
  addJob = async (name, _data, opts) => {
    enqueueOpts.push({ name, ...opts });
  };
});

describe('enqueueAtprotoIngest (per-op job key)', () => {
  it('keys two ops of the same commit distinctly', async () => {
    const commit = {
      pdsEndpoint: 'https://pds.example',
      did: 'did:web:p.example',
      rev: 'r1',
    };
    await enqueueAtprotoIngest({
      ...commit,
      ops: [{ action: 'create', path: 'app.bsky.feed.post/3abc', cid: 'c1' }],
    });
    await enqueueAtprotoIngest({
      ...commit,
      ops: [{ action: 'create', path: 'app.bsky.feed.like/3def', cid: 'c2' }],
    });
    expect(enqueueOpts.map((o) => o.jobId)).toEqual([
      'did:web:p.example:r1:app.bsky.feed.post/3abc',
      'did:web:p.example:r1:app.bsky.feed.like/3def',
    ]);
  });

  it('still dedups the same op enqueued twice (at-least-once firehose)', async () => {
    const commit = {
      pdsEndpoint: 'https://pds.example',
      did: 'did:web:p.example',
      rev: 'r1',
      ops: [{ action: 'create', path: 'app.bsky.feed.post/3abc', cid: 'c1' }],
    };
    await enqueueAtprotoIngest(commit);
    await enqueueAtprotoIngest(commit);
    // Identical jobId for both enqueues: BullMQ drops the second, so a
    // redelivered op re-processes idempotently instead of double-projecting.
    expect(enqueueOpts[0].jobId).toBe(enqueueOpts[1].jobId);
  });

  it('falls back to a stable key when the op list is empty', async () => {
    await enqueueAtprotoIngest({
      pdsEndpoint: 'https://pds.example',
      did: 'did:web:p.example',
      rev: 'r2',
    });
    expect(enqueueOpts[0].jobId).toBe('did:web:p.example:r2:commit');
  });
});

describe('firehose handleEvent (Event -> single-op job)', () => {
  it('maps an event to an op path of `${collection}/${rkey}`', async () => {
    await startAllowlistedIngest();
    expect(firehoseInstances.length).toBe(1);
    const handleEvent = firehoseInstances[0].handleEvent as (
      evt: unknown,
    ) => Promise<void>;
    await handleEvent({
      event: 'create',
      did: 'did:web:p.example',
      collection: 'app.bsky.feed.post',
      rkey: '3abc',
      cid: { toString: () => 'bafy-cid' } as never,
      record: { $type: 'app.bsky.feed.post', text: 'hi' },
      rev: { toString: () => 'r9' } as never,
    });
    expect(enqueueOpts.length).toBe(1);
    expect(enqueueOpts[0].jobId).toBe(
      'did:web:p.example:r9:app.bsky.feed.post/3abc',
    );
  });

  it('ignores non-op events (com.atproto.repo.commit etc.)', async () => {
    await startAllowlistedIngest();
    const handleEvent = firehoseInstances[0].handleEvent as (
      evt: unknown,
    ) => Promise<void>;
    await handleEvent({
      event: 'info',
      did: 'did:web:p.example',
      rev: { toString: () => 'r9' } as never,
    });
    expect(enqueueOpts.length).toBe(0);
  });
});
