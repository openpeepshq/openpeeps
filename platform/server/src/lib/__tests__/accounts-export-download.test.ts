import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const { resolveDownloadByToken, invalidateToken } = vi.hoisted(() => ({
  resolveDownloadByToken: vi.fn(),
  invalidateToken: vi.fn(),
}));

vi.mock('@openpeepshq/core/accounts', () => ({
  resolveDownloadByToken,
  invalidateToken,
}));
vi.mock('@openpeepshq/core/log', () => ({
  logger: () => ({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
}));

import { installAccountExportDownloadEndpoint } from '../accounts-export-download';

const ZIP_BYTES = Buffer.from(
  'PK\x03\x04fake-zip-bytes-for-export-download-test',
);
// Larger than any loopback socket buffer, so a client that stops reading
// after the first chunk backpressures the server's pipe: the response never
// "finishes" and the one-time token cannot be burned by a mid-transfer abort.
const LARGE_ZIP_BYTES = Buffer.concat([
  ZIP_BYTES,
  Buffer.alloc(32 * 1024 * 1024, 0xab),
]);

const startServer = async () => {
  const app = express();
  installAccountExportDownloadEndpoint(app);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.on('listening', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    base: `http://127.0.0.1:${port}`,
  };
};

const record = {
  jobId: 'job-1',
  accountId: 'account-1',
  state: 'ready' as const,
  token: 'tok-1',
  path: '',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

let server: { server: import('node:net').Server; base: string };
let zipPath: string;
let largeZipPath: string;

beforeAll(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dl-test-'));
  zipPath = path.join(dir, 'export.zip');
  await fs.writeFile(zipPath, ZIP_BYTES);
  largeZipPath = path.join(dir, 'large.zip');
  await fs.writeFile(largeZipPath, LARGE_ZIP_BYTES);
  server = await startServer();
});

beforeEach(() => {
  resolveDownloadByToken.mockReset();
  invalidateToken.mockReset();
  invalidateToken.mockResolvedValue(undefined);
  resolveDownloadByToken.mockImplementation(async (token: string) => {
    if (token === 'tok-1') return { ...record, path: zipPath };
    if (token === 'tok-2')
      return { ...record, token: 'tok-2', path: largeZipPath };
    return null;
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.server.close(() => resolve()));
  await fs.rm(zipPath, { recursive: true, force: true }).catch(() => undefined);
  await fs
    .rm(largeZipPath, { recursive: true, force: true })
    .catch(() => undefined);
});

describe('account export download endpoint', () => {
  it('401 without a token', async () => {
    const res = await fetch(
      `${server.base}/api/openpeeps/core/v1/accounts/current/export/download`,
    );
    expect(res.status).toBe(401);
  });

  it('410 for an unknown token', async () => {
    const res = await fetch(
      `${server.base}/api/openpeeps/core/v1/accounts/current/export/download?token=nope`,
    );
    expect(res.status).toBe(410);
    expect(invalidateToken).not.toHaveBeenCalled();
  });

  it('streams the zip and burns the token once the response finishes', async () => {
    const res = await fetch(
      `${server.base}/api/openpeeps/core/v1/accounts/current/export/download?token=tok-1`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(ZIP_BYTES)).toBe(true);
    // The token is a one-time link: it is invalidated exactly once, and only
    // after the body has been fully sent (not before streaming starts). The
    // client receiving all bytes does not imply the server's `finish` has
    // fired yet, so wait for the invalidation instead of a fixed sleep.
    await vi.waitFor(() => expect(invalidateToken).toHaveBeenCalledTimes(1));
    expect(invalidateToken).toHaveBeenCalledWith('tok-1');
  });

  it('410s when the store rejects the token (non-ready record), without burning the token', async () => {
    // The store is the ready-only guard: a token whose record is not in the
    // ready state (e.g. `expired` after its TTL lapsed) resolves to `null`.
    // The endpoint must turn that into a 410 without invalidating the token
    // (there is nothing to burn) and without any redis write.
    resolveDownloadByToken.mockResolvedValue(null);
    const res = await fetch(
      `${server.base}/api/openpeeps/core/v1/accounts/current/export/download?token=tok-expired`,
    );
    expect(res.status).toBe(410);
    expect(invalidateToken).not.toHaveBeenCalled();
  });

  it('410s when the store rejects the token (accountId mismatch), without burning the token', async () => {
    // A token that maps to a record belonging to a different account is
    // rejected by the store (returns `null`); the endpoint answers 410 and
    // never streams another account's archive or burns a token.
    resolveDownloadByToken.mockResolvedValue(null);
    const res = await fetch(
      `${server.base}/api/openpeeps/core/v1/accounts/current/export/download?token=tok-foreign`,
    );
    expect(res.status).toBe(410);
    expect(invalidateToken).not.toHaveBeenCalled();
  });

  it('does not burn the token when the client aborts mid-transfer; a retry still 200s', async () => {
    // The subtlest path in the handler: the client disconnects before the
    // body is fully sent. The response must stop reading the file (no leak)
    // but must NOT invalidate the one-time token, so the download can be
    // retried. A client that only reads one chunk and stops backpressures the
    // server's pipe (the file far exceeds the socket buffer), so the response
    // never reaches `finish` — the `close`-guarded destroy is what runs.
    const url = `${server.base}/api/openpeeps/core/v1/accounts/current/export/download?token=tok-2`;
    const controller = new AbortController();
    const res = await fetch(url, { signal: controller.signal });
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    await reader.read(); // one chunk, then stop reading
    controller.abort();
    await new Promise((r) => setTimeout(r, 50)); // let the close propagate

    expect(invalidateToken).not.toHaveBeenCalled();

    // The token survived the aborted transfer: a fresh request streams the
    // whole archive again, and only that completed transfer burns the token.
    const retry = await fetch(url);
    expect(retry.status).toBe(200);
    const body = Buffer.from(await retry.arrayBuffer());
    expect(body.equals(LARGE_ZIP_BYTES)).toBe(true);
    // The client receiving all bytes does not imply the server's `finish`
    // (which burns the token) has fired yet, so wait for it instead of a fixed
    // sleep — under a loaded runner the socket flush can lag the last byte.
    await vi.waitFor(() => expect(invalidateToken).toHaveBeenCalledTimes(1));
    expect(invalidateToken).toHaveBeenCalledWith('tok-2');
  });
});
