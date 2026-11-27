import { WriteOpAction } from '@atproto/repo';
import { describe, expect, it } from 'vitest';
import {
  buildSignedRepoCar,
  buildSignedRepoCarIncremental,
  readRepoBlocks,
  readRepoRootCid,
  verifyRepoCar,
} from './car';
import { generateAtprotoKeyPair } from './identity';

const noteRecord = (text: string) => ({
  $type: 'app.bsky.feed.post',
  text,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('atproto car', () => {
  it('builds a signed repo CAR that @atproto/repo can load', async () => {
    const keys = await generateAtprotoKeyPair();
    const did = 'did:web:community.example:atproto:users:alice';
    const built = await buildSignedRepoCar({
      did,
      privateKey: keys.privateKey,
      records: [
        {
          collection: 'app.bsky.feed.post',
          rkey: '3abc',
          record: noteRecord('hello'),
        },
      ],
    });
    expect(built.commitCid).toMatch(/^bafy/);
    expect(built.car.byteLength).toBeGreaterThan(0);
    const verified = await verifyRepoCar(built.car);
    expect(verified.did).toBe(did);
    expect(verified.commitCid).toBe(built.commitCid);
  });

  it('applies an incremental commit onto the previous CAR, keeping both records', async () => {
    const keys = await generateAtprotoKeyPair();
    const did = 'did:web:community.example:atproto:users:bob';
    const first = await buildSignedRepoCar({
      did,
      privateKey: keys.privateKey,
      records: [
        {
          collection: 'app.bsky.feed.post',
          rkey: '3aaa',
          record: noteRecord('one'),
        },
      ],
    });
    const second = await buildSignedRepoCarIncremental({
      did,
      privateKey: keys.privateKey,
      previousCar: first.car,
      writes: [
        {
          action: WriteOpAction.Create,
          collection: 'app.bsky.feed.post',
          rkey: '3bbb',
          record: noteRecord('two'),
        },
      ],
    });

    // The new commit points back at the previous one (chained rev).
    expect(second.prev).toBe(first.commitCid);
    expect(second.commitCid).not.toBe(first.commitCid);
    // The diff CAR is smaller than the full CAR: it ships only the new blocks.
    expect(second.car.byteLength).toBeLessThan(second.fullCar.byteLength);
    // The full CAR still loads as a complete, importable repo with both records.
    const verified = await verifyRepoCar(second.fullCar);
    expect(verified.commitCid).toBe(second.commitCid);
    expect(verified.did).toBe(did);
  });

  it('reads the root CID and a single block back out of a stored CAR', async () => {
    const keys = await generateAtprotoKeyPair();
    const did = 'did:web:community.example:atproto:users:carol';
    const built = await buildSignedRepoCar({
      did,
      privateKey: keys.privateKey,
      records: [
        {
          collection: 'app.bsky.feed.post',
          rkey: '3ccc',
          record: noteRecord('solo'),
        },
      ],
    });
    const root = await readRepoRootCid(built.car);
    expect(root?.toString()).toBe(built.commitCid);
    const subset = await readRepoBlocks(built.car, [root as never]);
    expect(new Uint8Array(subset).byteLength).toBeGreaterThan(0);
  });
});
