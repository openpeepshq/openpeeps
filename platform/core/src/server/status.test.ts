import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cpuTimes,
  cpuUsedPercent,
  diskUsage,
  folderSize,
  hostResources,
  memoryUsage,
} from './status';

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

describe('cpuTimes', () => {
  it('sums idle and total from cpu snapshots', () => {
    const cpu = (idle: number, user: number) => ({
      model: 'test',
      speed: 1,
      times: { user, nice: 0, sys: 0, idle, irq: 0 },
    });
    expect(cpuTimes([cpu(9, 1), cpu(18, 2)])).toEqual({
      idle: 27,
      total: 30,
    });
  });
});

describe('cpuUsedPercent', () => {
  it('returns busy share between two samples', () => {
    expect(
      cpuUsedPercent({ idle: 10, total: 20 }, { idle: 12, total: 40 }),
    ).toBe(90);
  });

  it('returns 0 when total does not increase', () => {
    expect(cpuUsedPercent({ idle: 1, total: 2 }, { idle: 1, total: 2 })).toBe(
      0,
    );
  });
});

describe('memoryUsage', () => {
  it('returns used bytes from total minus free', () => {
    expect(memoryUsage(100, 25)).toEqual({ usedBytes: 75, totalBytes: 100 });
  });

  it('returns null when total is not positive', () => {
    expect(memoryUsage(0, 0)).toBeNull();
  });
});

describe('hostResources', () => {
  it('returns memory totals and a cpu percent in range', async () => {
    const resources = await hostResources(async () => undefined);
    expect(resources.memoryTotalBytes).toBeGreaterThan(0);
    expect(resources.memoryUsedBytes).toBeGreaterThanOrEqual(0);
    expect(resources.memoryUsedBytes).toBeLessThanOrEqual(
      resources.memoryTotalBytes,
    );
    expect(resources.cpuUsedPercent).toBeGreaterThanOrEqual(0);
    expect(resources.cpuUsedPercent).toBeLessThanOrEqual(100);
  });
});
