import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { diskUsage } from './status';

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('diskUsage', () => {
  it('returns totals for an existing directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'op-media-'));
    tmpDirs.push(dir);
    const usage = await diskUsage(dir);
    expect(usage).not.toBeNull();
    expect(usage?.totalBytes).toBeGreaterThan(0);
    expect(usage?.freeBytes).toBeGreaterThanOrEqual(0);
    expect(usage!.freeBytes).toBeLessThanOrEqual(usage!.totalBytes);
  });

  it('returns null when the path cannot be read', async () => {
    expect(await diskUsage('/no/such/openpeeps-media-path')).toBeNull();
  });
});
