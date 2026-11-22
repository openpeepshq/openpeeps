import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const { redisGet, redisSet, redisDel } = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
}));

vi.mock('../redis', () => ({
  getSharedConnection: async () => ({
    get: redisGet,
    set: redisSet,
    del: redisDel,
  }),
}));
vi.mock('../config', () => ({
  config: vi.fn(),
  communityConfig: vi.fn(),
}));
vi.mock('../log', () => ({
  logger: () => ({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
}));

import {
  getExportByJob,
  markExportReady,
  resolveDownloadByToken,
} from './exportStore';

beforeEach(() => {
  redisGet.mockReset();
  redisSet.mockReset();
  redisDel.mockReset();
  redisSet.mockResolvedValue(undefined);
  redisDel.mockResolvedValue(undefined);
});

const readyRecord = (overrides: Record<string, unknown> = {}) => ({
  jobId: 'job-1',
  accountId: 'account-1',
  state: 'ready',
  token: 'tok-1',
  path: __filename,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  ...overrides,
});

describe('getExportByJob', () => {
  it('reports a missing record as null (job not started yet)', async () => {
    redisGet.mockResolvedValue(null);
    await expect(getExportByJob('nope')).resolves.toBeNull();
  });

  it('reports an expired ready archive as expired, not building', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify(
        readyRecord({
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ),
    );
    await expect(getExportByJob('job-1')).resolves.toMatchObject({
      state: 'expired',
    });
  });

  it('reports a ready archive whose zip was cleaned up as expired', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exp-store-'));
    redisGet.mockResolvedValue(
      JSON.stringify(readyRecord({ path: path.join(dir, 'missing.zip') })),
    );
    await expect(getExportByJob('job-1')).resolves.toMatchObject({
      state: 'expired',
    });
  });

  it('keeps ready state while the archive exists and is unexpired', async () => {
    redisGet.mockResolvedValue(JSON.stringify(readyRecord()));
    await expect(getExportByJob('job-1')).resolves.toMatchObject({
      state: 'ready',
      token: 'tok-1',
    });
  });
});

describe('resolveDownloadByToken', () => {
  it('rejects an unknown token', async () => {
    redisGet.mockResolvedValue(null);
    await expect(resolveDownloadByToken('unknown')).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify(
        readyRecord({
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ),
    );
    await expect(resolveDownloadByToken('tok-1')).resolves.toBeNull();
  });

  it('resolves a valid, unexpired token whose file exists', async () => {
    redisGet.mockResolvedValue(JSON.stringify(readyRecord()));
    const record = await resolveDownloadByToken('tok-1');
    expect(record?.state).toBe('ready');
  });

  it('rejects a token whose record is not in the ready state (building)', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify(readyRecord({ state: 'building' })),
    );
    await expect(resolveDownloadByToken('tok-1')).resolves.toBeNull();
  });

  it('rejects a token whose record is in the error state', async () => {
    redisGet.mockResolvedValue(
      JSON.stringify(readyRecord({ state: 'error', error: 'export failed' })),
    );
    await expect(resolveDownloadByToken('tok-1')).resolves.toBeNull();
  });

  it('rejects a token whose record is ready but whose zip is missing', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exp-store-'));
    redisGet.mockResolvedValue(
      JSON.stringify(readyRecord({ path: path.join(dir, 'missing.zip') })),
    );
    await expect(resolveDownloadByToken('tok-1')).resolves.toBeNull();
  });
});

describe('markExportReady', () => {
  it('records the same ready record under both the job and the token key', async () => {
    const writes: { key: string; value: unknown }[] = [];
    redisSet.mockImplementation(async (key: string, value: string) => {
      writes.push({ key, value: JSON.parse(value) });
    });
    const { token } = await markExportReady('job-9', 'account-9', '/x.zip');
    expect(token).toMatch(/^[\da-f-]{36}$/);
    expect(writes).toHaveLength(2);
    expect(writes[0].key).toContain('job-9');
    expect(writes[1].key).toContain(`token:${token}`);
    expect(writes[0].value).toMatchObject({
      state: 'ready',
      token,
      path: '/x.zip',
    });
    expect(writes[1].value).toStrictEqual(writes[0].value);
  });
});
