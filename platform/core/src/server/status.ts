import { statfs } from 'node:fs/promises';

export const processStartedAt = new Date(
  Date.now() - process.uptime() * 1000,
).toISOString();

export type MediaDiskUsage = {
  totalBytes: number;
  freeBytes: number;
};

/** Filesystem usage for the media storage directory. Null if unreadable. */
export const diskUsage = async (
  mediaPath: string,
): Promise<MediaDiskUsage | null> => {
  try {
    const stats = await statfs(mediaPath);
    const blockSize = Number(stats.bsize);
    const totalBytes = Number(stats.blocks) * blockSize;
    const freeBytes = Number(stats.bavail) * blockSize;
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null;
    return { totalBytes, freeBytes };
  } catch {
    return null;
  }
};
