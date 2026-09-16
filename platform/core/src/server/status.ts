import { readdir, stat, statfs } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { HostResourceStats } from '@openpeepshq/common/types';

export const processStartedAt = new Date(
  Date.now() - process.uptime() * 1000,
).toISOString();

export type MediaDiskUsage = {
  folderBytes: number;
  totalBytes: number;
  freeBytes: number;
};

const FOLDER_SIZE_CACHE_MS = 30_000;

let folderSizeCache: {
  mediaPath: string;
  at: number;
  bytes: number;
} | null = null;

/** Sum of regular files under dir. Skips unreadable entries. */
export const folderSize = async (dir: string): Promise<number> => {
  let total = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        total += await folderSize(full);
        continue;
      }
      if (entry.isFile()) {
        total += (await stat(full)).size;
      }
    } catch {
      // Skip entries we cannot stat (permissions, races).
    }
  }
  return total;
};

const cachedFolderSize = async (mediaPath: string): Promise<number> => {
  const now = Date.now();
  if (
    folderSizeCache &&
    folderSizeCache.mediaPath === mediaPath &&
    now - folderSizeCache.at < FOLDER_SIZE_CACHE_MS
  ) {
    return folderSizeCache.bytes;
  }
  const bytes = await folderSize(mediaPath);
  folderSizeCache = { mediaPath, at: now, bytes };
  return bytes;
};

/** Media-folder byte size plus free space on that volume. Null if unreadable. */
export const diskUsage = async (
  mediaPath: string,
): Promise<MediaDiskUsage | null> => {
  try {
    const stats = await statfs(mediaPath);
    const blockSize = Number(stats.bsize);
    const totalBytes = Number(stats.blocks) * blockSize;
    const freeBytes = Number(stats.bavail) * blockSize;
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null;
    const folderBytes = await cachedFolderSize(mediaPath);
    return { folderBytes, totalBytes, freeBytes };
  } catch {
    return null;
  }
};

export type CpuTimes = {
  idle: number;
  total: number;
};

export const cpuTimes = (
  cpus: Array<{ times: os.CpuInfo['times'] }> = os.cpus(),
): CpuTimes => {
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const times = cpu.times;
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { idle, total };
};

export const cpuUsedPercent = (previous: CpuTimes, next: CpuTimes): number => {
  const idleDelta = next.idle - previous.idle;
  const totalDelta = next.total - previous.total;
  if (totalDelta <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - idleDelta / totalDelta) * 100));
};

export const memoryUsage = (
  totalBytes = os.totalmem(),
  freeBytes = os.freemem(),
): { usedBytes: number; totalBytes: number } | null => {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null;
  const usedBytes = Math.max(
    0,
    Math.min(totalBytes, totalBytes - Math.max(0, freeBytes)),
  );
  return { usedBytes, totalBytes };
};

const CPU_SAMPLE_MS = 50;

export const hostResources = async (
  wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<HostResourceStats> => {
  const memory = memoryUsage();
  const previous = cpuTimes();
  await wait(CPU_SAMPLE_MS);
  const cpuPercent = Math.round(cpuUsedPercent(previous, cpuTimes()) * 10) / 10;
  return {
    memoryUsedBytes: memory?.usedBytes ?? 0,
    memoryTotalBytes: memory?.totalBytes ?? 0,
    cpuUsedPercent: cpuPercent,
  };
};
