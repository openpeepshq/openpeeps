import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { diskUsage, folderSize } from './status';

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('diskUsage', () => {
  it('returns volume totals and folder size for an existing directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'op-media-'));
    tmpDirs.push(dir);
    const nested = path.join(dir, 'nested');
    await mkdir(nested);
    await writeFile(path.join(dir, 'a.bin'), Buffer.alloc(1_024));
    await writeFile(path.join(nested, 'b.bin'), Buffer.alloc(2_048));

    const usage = await diskUsage(dir);
    expect(usage).not.toBeNull();
    expect(usage?.folderBytes).toBe(3_072);
    expect(usage?.totalBytes).toBeGreaterThan(0);
    expect(usage?.freeBytes).toBeGreaterThanOrEqual(0);
    expect(usage!.freeBytes).toBeLessThanOrEqual(usage!.totalBytes);
  });

  it('returns null when the path cannot be read', async () => {
    expect(await diskUsage('/no/such/openpeeps-media-path')).toBeNull();
  });
});

describe('folderSize', () => {
  it('returns 0 for an empty directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'op-media-empty-'));
    tmpDirs.push(dir);
    expect(await folderSize(dir)).toBe(0);
  });
});
