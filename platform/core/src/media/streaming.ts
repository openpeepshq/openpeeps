import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import type { MediaStream, MediaStreamStatus } from '@openpeepshq/common/types';
import { config } from '../config';
import { logger } from '../log';
import { getSharedConnection } from '../redis/connection';
import { serverRootUrl } from '../server';

const log = logger('app:media:streaming');

export const HLS_MASTER_PLAYLIST = 'hls.m3u8';
export const HLS_ERRORS_LOG = 'errors.log';

const STREAM_ACCESS_KEY = 'media:streaming:lastAccess';
// One write per stream per minute is plenty — HLS playback will fetch many
// segments and we don't need to hammer Redis with a write for each. The
// debounce is per-process; multiple app/worker processes will each issue at
// most one write per window which is still fine.
const ACCESS_WRITE_DEBOUNCE_MS = 60_000;
const lastAccessWriteCache = new Map<string, number>();

const getStorageParams = async () => (await config()).media.storage.params;

const getHlsRoot = async (): Promise<string> => {
  const params = await getStorageParams();
  return join(params.path, 'hls');
};

/**
 * Returns the on-disk directory used to hold the HLS output for the given
 * source storage id. The directory may or may not exist yet — callers must
 * check before reading from it.
 */
export const getStreamDir = async (storageId: string): Promise<string> => {
  const hlsRoot = await getHlsRoot();
  return join(hlsRoot, storageId);
};

const isValidStorageId = (storageId: string): boolean => {
  // Source storage ids in this codebase are content-addressed base64url SHA-256
  // digests. Restrict to the same alphabet so that an attacker can never use
  // path traversal characters (`/`, `..`, `\0`, etc.) to escape the streaming
  // root.
  return /^[A-Za-z0-9_-]{1,128}$/.test(storageId);
};

/**
 * Extracts the local storage id from a media url that points to this
 * server's `/<prefix>/allpeep/<id>/<filename>` route. Returns `null` for any
 * url that does not match — including urls pointing at other hosts or urls
 * that match the right shape but a different storage driver.
 */
export const parseLocalStorageUrl = async (
  rawUrl: string,
): Promise<string | null> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const rootUrl = await serverRootUrl();
  const root = new URL(rootUrl);
  // Compare host loosely — protocol may differ between requests behind a
  // reverse proxy, and a port mismatch is also tolerated as long as the host
  // matches the configured server host.
  if (url.host !== root.host && url.hostname !== root.hostname) {
    return null;
  }

  const params = await getStorageParams();
  const prefix = params.prefix.replace(/\/+$/, '');
  const expectedPrefix = `${prefix}/allpeep/`;
  if (!url.pathname.startsWith(expectedPrefix)) {
    return null;
  }

  const rest = url.pathname.slice(expectedPrefix.length);
  const [storageId] = rest.split('/');
  if (!storageId || !isValidStorageId(storageId)) {
    return null;
  }
  return storageId;
};

/**
 * Joins a (potentially user-supplied) sub-path under the stream directory and
 * guarantees the result is contained within `streamDir`. Returns `null` if the
 * normalised path would escape the directory or references suspicious
 * components.
 */
export const resolveStreamFile = (
  streamDir: string,
  relativePath: string,
): string | null => {
  if (!relativePath || relativePath.includes('\0')) {
    return null;
  }
  const normalisedRelative = normalize(relativePath);
  if (
    normalisedRelative.startsWith('..') ||
    normalisedRelative.includes(`${sep}..${sep}`) ||
    normalisedRelative === '..'
  ) {
    return null;
  }
  const full = join(streamDir, normalisedRelative);
  const normalisedStreamDir = normalize(streamDir);
  if (
    full !== normalisedStreamDir &&
    !full.startsWith(normalisedStreamDir + sep)
  ) {
    return null;
  }
  return full;
};

/**
 * Inspects the stream directory on disk to decide the current status.
 *
 * - `errors.log` present → `error` (transcoding failed and left a message)
 * - master playlist (`hls.m3u8`) present → `ready`
 * - otherwise → `processing` (the job is still running, or was interrupted)
 *
 * Returns `null` if the stream directory does not exist at all.
 */
export const getStreamStatus = async (
  storageId: string,
): Promise<{
  status: MediaStreamStatus;
  error?: string;
} | null> => {
  if (!isValidStorageId(storageId)) {
    return null;
  }
  const streamDir = await getStreamDir(storageId);
  try {
    const stat = await fs.stat(streamDir);
    if (!stat.isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }

  const errorsPath = join(streamDir, HLS_ERRORS_LOG);
  if (existsSync(errorsPath)) {
    let error: string | undefined;
    try {
      error = (await fs.readFile(errorsPath, 'utf8')).trim() || undefined;
    } catch (e) {
      log.warn(`Failed to read ${errorsPath}: ${(e as Error).message}`);
    }
    return { status: 'error', error };
  }

  const masterPath = join(streamDir, HLS_MASTER_PLAYLIST);
  if (existsSync(masterPath)) {
    return { status: 'ready' };
  }

  return { status: 'processing' };
};

export const buildStream = async (
  storageId: string,
): Promise<MediaStream | null> => {
  const status = await getStreamStatus(storageId);
  if (!status) {
    return null;
  }
  return { storageId, ...status };
};

export const ensureStreamDir = async (storageId: string): Promise<string> => {
  const streamDir = await getStreamDir(storageId);
  await fs.mkdir(streamDir, { recursive: true });
  return streamDir;
};

/**
 * Records that the given stream was accessed at the current wall-clock time.
 *
 * Backed by a Redis sorted set keyed by storage id with timestamps as scores —
 * keeping it in one key (vs. one key per stream) makes the daily cleanup job
 * a single `ZRANGEBYSCORE` instead of a `SCAN`.
 *
 * In-process debounced to one write per stream per
 * {@link ACCESS_WRITE_DEBOUNCE_MS} window. HLS playback fetches many segments
 * per minute; a write per segment would saturate the Redis pipe for no
 * meaningful precision win — the cleanup window is measured in days.
 *
 * Errors are swallowed and logged: this is a best-effort signal for cleanup
 * and must never break the file-serving path that calls it.
 */
export const recordStreamAccess = async (storageId: string): Promise<void> => {
  if (!isValidStorageId(storageId)) return;
  const now = Date.now();
  const lastWrite = lastAccessWriteCache.get(storageId);
  if (lastWrite !== undefined && now - lastWrite < ACCESS_WRITE_DEBOUNCE_MS) {
    return;
  }
  lastAccessWriteCache.set(storageId, now);

  try {
    const conn = await getSharedConnection();
    await conn.zAdd(STREAM_ACCESS_KEY, { score: now, value: storageId });
  } catch (e) {
    log.warn(
      `Failed to record stream access for ${storageId}: ${
        (e as Error).message
      }`,
    );
    // Roll back the cache entry so the next request will retry.
    lastAccessWriteCache.delete(storageId);
  }
};

export const getStreamLastAccess = async (
  storageId: string,
): Promise<number | null> => {
  if (!isValidStorageId(storageId)) return null;
  const conn = await getSharedConnection();
  const score = await conn.zScore(STREAM_ACCESS_KEY, storageId);
  return typeof score === 'number' ? score : null;
};

export interface CleanupResult {
  deleted: string[];
  kept: number;
  skipped: string[];
}

/**
 * Deletes every stream directory whose Redis-recorded last-access time is
 * older than `maxAgeMs`, or which has no Redis entry at all. A missing entry
 * means the stream was never accessed since the last Redis wipe — HLS
 * directories are a cache derived from the source media, so treating "no
 * record" as "evictable" is safe: anything actually being used will have been
 * touched by the POST handler or the file-serving route already.
 *
 * Note: this implies a Redis wipe causes the next cleanup run to delete
 * every existing stream. That's intentional. The streams will be lazily
 * regenerated on the next POST.
 *
 * Directories whose name fails {@link isValidStorageId} are left alone —
 * those are foreign files placed in the hls root by the operator and must
 * never be touched by automated cleanup.
 */
export const cleanupStaleStreams = async (
  maxAgeMs: number,
): Promise<CleanupResult> => {
  const hlsRoot = await getHlsRoot();
  let entries: string[];
  try {
    entries = await fs.readdir(hlsRoot);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { deleted: [], kept: 0, skipped: [] };
    }
    throw e;
  }

  const cutoff = Date.now() - maxAgeMs;
  const conn = await getSharedConnection();
  const result: CleanupResult = { deleted: [], kept: 0, skipped: [] };

  for (const name of entries) {
    const fullPath = join(hlsRoot, name);
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    if (!isValidStorageId(name)) {
      result.skipped.push(name);
      continue;
    }

    const redisAccess = await conn
      .zScore(STREAM_ACCESS_KEY, name)
      .catch(() => null);
    const lastAccess = typeof redisAccess === 'number' ? redisAccess : 0;

    if (lastAccess < cutoff) {
      try {
        await fs.rm(fullPath, { recursive: true, force: true });
        await conn.zRem(STREAM_ACCESS_KEY, name);
        lastAccessWriteCache.delete(name);
        result.deleted.push(name);
      } catch (e) {
        log.error(
          `Failed to delete stale stream ${name}: ${(e as Error).message}`,
        );
      }
    } else {
      result.kept++;
    }
  }

  return result;
};
