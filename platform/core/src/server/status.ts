import { statfs } from 'node:fs/promises';
import os from 'node:os';
import type { ServerInfo } from '@openpeepshq/common/types';

export const processStartedAt = new Date(
  Date.now() - process.uptime() * 1000,
).toISOString();

export const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const profileLimit = (maxProfiles: number | undefined): number | null =>
  maxProfiles && maxProfiles > 0 ? maxProfiles : null;

const loadAverage = (): [number, number, number] => {
  const [one = 0, five = 0, fifteen = 0] = os.loadavg();
  return [one, five, fifteen];
};

export const resourceSnapshot = () => {
  const memory = process.memoryUsage();
  return {
    processMemory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    },
    systemMemory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    loadAverage: loadAverage(),
  };
};

export const diskUsage = async (
  path: string,
): Promise<ServerInfo['resources']['disk']> => {
  try {
    const stats = await statfs(path);
    const blockSize = Number(stats.bsize);
    return {
      path,
      totalBytes: Number(stats.blocks) * blockSize,
      freeBytes: Number(stats.bavail) * blockSize,
    };
  } catch {
    return null;
  }
};
