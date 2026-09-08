import { statfs } from 'node:fs/promises';
import os from 'node:os';
import type { AdminServerStatus } from '@openpeepshq/common/types';
import { accountsMapping } from '../accounts/mapping';
import { config } from '../config';
import { allpeepDb } from '../db';
import { baseProfilesMapping } from '../profiles/mapping';

const processStartedAt = new Date(
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
): Promise<AdminServerStatus['resources']['disk']> => {
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

export const adminServerStatus = async (): Promise<AdminServerStatus> => {
  const coreConfig = await config();
  const { db } = await allpeepDb();
  const [profileCount, accountCount, disk] = await Promise.all([
    baseProfilesMapping.count(db),
    accountsMapping.count(db),
    diskUsage(coreConfig.media.storage.params.path),
  ]);

  return {
    version: coreConfig.version,
    build: trimToNull(process.env.BUILD),
    environment: coreConfig.environment,
    startedAt: processStartedAt,
    uptimeSeconds: process.uptime(),
    subscription: {
      plan: trimToNull(process.env.ALLPEEP_SUBSCRIPTION),
      maxProfiles: profileLimit(coreConfig.server.maxProfiles),
      profileCount,
      accountCount,
    },
    resources: {
      ...resourceSnapshot(),
      disk,
    },
  };
};
