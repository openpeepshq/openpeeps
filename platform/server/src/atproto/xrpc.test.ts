import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { canCreatePublicNote } from './writes';

vi.mock('@openpeepshq/core/atproto', () => ({
  atprotoIsActive: vi.fn(async () => true),
  loadLocalAtprotoIdentity: vi.fn(),
  describeRepo: vi.fn(),
  getRecord: vi.fn(),
  listRecords: vi.fn(),
  getLatestCommit: vi.fn(),
  getRepoCar: vi.fn(),
  getRepoSnapshot: vi.fn(),
  handleTxtRecord: vi.fn((did: string) => `did=${did}`),
  requestRelayCrawl: vi.fn(),
  listRepos: vi.fn(),
  listBlobsForDid: vi.fn(),
  readBlobBytes: vi.fn(),
  getProfileView: vi.fn(),
  getProfileViews: vi.fn(),
  getAuthorFeed: vi.fn(),
  getPostsByAtUris: vi.fn(),
  getPostThread: vi.fn(),
  getFollows: vi.fn(),
  getFollowers: vi.fn(),
  getRelationships: vi.fn(),
  createAtprotoTokens: vi.fn(),
  verifyAtprotoRefresh: vi.fn(),
  ATPROTO_ACCESS_SCOPE: 'com.atproto.access',
}));

vi.mock('@openpeepshq/core/config', () => ({
  config: vi.fn(async () => ({
    atproto: { handleDomain: 'community.example' },
  })),
}));

describe('atproto xrpc', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('describes the server and resolves a handle', async () => {
    const { loadLocalAtprotoIdentity } = await import(
      '@openpeepshq/core/atproto'
    );
    vi.mocked(loadLocalAtprotoIdentity).mockResolvedValue({
      id: 'p1',
      handle: 'alice',
      did: 'did:web:community.example:atproto:users:alice',
      atHandle: 'alice.community.example',
      publicKeyDid: 'did:key:z',
      privateKey: 'k',
    });
    const { atprotoXrpcRouter } = await import('./xrpc');
    const app = express();
    app.use('/xrpc', atprotoXrpcRouter());

    const describe = await fetchOn(
      app,
      '/xrpc/com.atproto.server.describeServer',
    );
    expect(describe.status).toBe(200);
    expect(describe.body.availableUserDomains).toEqual(['.community.example']);

    const resolved = await fetchOn(
      app,
      '/xrpc/com.atproto.identity.resolveHandle?handle=alice',
    );
    expect(resolved.status).toBe(200);
    expect(resolved.body.did).toBe(
      'did:web:community.example:atproto:users:alice',
    );
  });

  it('does not allow group visibility through the public-note capability helper', () => {
    expect(canCreatePublicNote([])).toBe(false);
    expect(
      canCreatePublicNote([
        {
          id: 'r',
          key: 'member',
          capabilities: { add: ['core-posts-create-note-public'], remove: [] },
        } as never,
      ]),
    ).toBe(true);
  });
});

const fetchOn = async (app: express.Express, path: string) => {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('no port');
  }
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    server.close();
  }
};
