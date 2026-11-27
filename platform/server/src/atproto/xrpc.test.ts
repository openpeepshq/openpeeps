import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';

vi.mock('@openpeepshq/core/atproto', () => ({
  atprotoIsActive: vi.fn(async () => true),
  loadLocalAtprotoIdentity: vi.fn(),
  describeRepo: vi.fn(),
  getRecord: vi.fn(),
  listRecords: vi.fn(),
  getLatestCommit: vi.fn(),
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

  it('caps app.bsky.feed.getPosts uris at the lexicon maximum (100)', async () => {
    const { getPostsByAtUris } = await import('@openpeepshq/core/atproto');
    vi.mocked(getPostsByAtUris).mockResolvedValue({ posts: [] });
    const { atprotoXrpcRouter } = await import('./xrpc');
    const app = express();
    app.use('/xrpc', atprotoXrpcRouter());

    // 120 client-supplied uris must be capped to the first 100.
    const uris = Array.from({ length: 120 }, (_, i) => `at://d/p/3${i}`);
    const path =
      '/xrpc/app.bsky.feed.getPosts?' + uris.map((u) => `uris=${u}`).join('&');
    const { status, body } = await fetchOn(app, path);
    expect(status).toBe(200);
    expect(body).toEqual({ posts: [] });
    const passed = vi.mocked(getPostsByAtUris).mock.calls[0][0];
    expect(passed).toHaveLength(100);
    expect(passed[0]).toBe('at://d/p/30');
    expect(passed[99]).toBe('at://d/p/399');
    expect(passed).not.toContain('at://d/p/3119');
  });

  it('com.atproto.sync.getBlob returns 404 when the blob is gone', async () => {
    const { readBlobBytes } = await import('@openpeepshq/core/atproto');
    vi.mocked(readBlobBytes).mockResolvedValue(null);
    const { atprotoXrpcRouter } = await import('./xrpc');
    const app = express();
    app.use('/xrpc', atprotoXrpcRouter());

    const { status, body } = await fetchOn(
      app,
      '/xrpc/com.atproto.sync.getBlob?cid=bafy-gone',
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: 'NotFound', message: 'Unknown blob' });
  });

  it('com.atproto.sync.getBlob falls back to application/octet-stream when the blob has no MIME type', async () => {
    const { readBlobBytes } = await import('@openpeepshq/core/atproto');
    vi.mocked(readBlobBytes).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: null,
    });
    const { atprotoXrpcRouter } = await import('./xrpc');
    const app = express();
    app.use('/xrpc', atprotoXrpcRouter());

    const { status, headers, text } = await fetchOn(
      app,
      '/xrpc/com.atproto.sync.getBlob?cid=bafy-nomime',
    );
    expect(status).toBe(200);
    expect(headers['content-type']).toBe('application/octet-stream');
    // The response body is the raw blob bytes, not a JSON envelope.
    expect(text).toBe('\u0001\u0002\u0003');
  });

  it('com.atproto.sync.getBlob hardens the response against active content', async () => {
    const { readBlobBytes } = await import('@openpeepshq/core/atproto');
    vi.mocked(readBlobBytes).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
    });
    const { atprotoXrpcRouter } = await import('./xrpc');
    const app = express();
    app.use('/xrpc', atprotoXrpcRouter());

    const { status, headers } = await fetchOn(
      app,
      '/xrpc/com.atproto.sync.getBlob?cid=bafy-harden',
    );
    expect(status).toBe(200);
    expect(headers['content-type']).toBe('image/png');
    // A spoofed MIME type must not become active content or an inline
    // download: nosniff + attachment + a sandboxed CSP pin the response.
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toBe('attachment');
    expect(headers['content-security-policy']).toBe(
      "default-src 'none'; sandbox",
    );
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
    const clone = response.clone();
    const text = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text,
      // JSON endpoints only; binary responses (getBlob) stay in `text`.
      body: response.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(await clone.text())
        : undefined,
    };
  } finally {
    server.close();
  }
};
