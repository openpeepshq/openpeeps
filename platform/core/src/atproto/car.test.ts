import { describe, expect, it } from 'vitest';
import { generateAtprotoKeyPair } from './identity';
import { buildSignedRepoCar, verifyRepoCar } from './car';

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
          record: {
            $type: 'app.bsky.feed.post',
            text: 'hello',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        },
      ],
    });
    expect(built.commitCid).toMatch(/^bafy/);
    expect(built.car.byteLength).toBeGreaterThan(0);
    const verified = await verifyRepoCar(built.car);
    expect(verified.did).toBe(did);
    expect(verified.commitCid).toBe(built.commitCid);
  });
});
