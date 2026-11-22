import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat, readdir } from 'node:fs/promises';
import { getSharedConnection } from '../redis';
import { config } from '../config';
import { logger } from '../log';

const log = logger('app:accounts:exportStore');

/** Download tokens and the assembled archives live for 7 days. */
export const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPORT_TTL_SECONDS = Math.floor(EXPORT_TTL_MS / 1000);

const byJobKey = (jobId: string) => `openpeeps:account-export:${jobId}`;
const byTokenKey = (token: string) => `openpeeps:account-export:token:${token}`;

export type ExportRecordState = 'building' | 'ready' | 'error' | 'expired';

export interface AccountExportCleanupResult {
  removed: number;
}

export interface ExportRecord {
  jobId: string;
  accountId: string;
  state: ExportRecordState;
  token?: string;
  /** Absolute path to the assembled zip (present once `ready`). */
  path?: string;
  /** ISO timestamp the token/zip stop working. */
  expiresAt?: string;
  error?: string;
}

const readRecord = async <T = ExportRecord>(
  key: string,
): Promise<T | undefined> => {
  const redis = await getSharedConnection();
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : undefined;
};

const writeRecord = async (
  key: string,
  record: ExportRecord,
  ttlSeconds = EXPORT_TTL_SECONDS,
) => {
  const redis = await getSharedConnection();
  await redis.set(key, JSON.stringify(record), { EX: ttlSeconds });
};

/** Resolve the directory that holds assembled export zips. */
export const exportDir = async (): Promise<string> => {
  const {
    media: {
      storage: { params },
    },
  } = await config();
  return path.join(params.path, 'exports');
};

/**
 * Mark an export job as building. Called by the worker at the start of the
 * job so the status endpoint reports "building" from the first moment on.
 */
export const markExportBuilding = async (jobId: string, accountId: string) => {
  await writeRecord(byJobKey(jobId), {
    jobId,
    accountId,
    state: 'building',
  });
};

/**
 * Mark an export as ready: mint a one-time download token and record the zip
 * path + expiry under both the job and the token keys.
 */
export const markExportReady = async (
  jobId: string,
  accountId: string,
  zipPath: string,
) => {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + EXPORT_TTL_MS).toISOString();
  const record: ExportRecord = {
    jobId,
    accountId,
    state: 'ready',
    token,
    path: zipPath,
    expiresAt,
  };
  await writeRecord(byJobKey(jobId), record);
  await writeRecord(byTokenKey(token), record);
  return { token, expiresAt };
};

/** Mark an export as failed (recorded so the status endpoint can report it). */
export const markExportError = async (
  jobId: string,
  accountId: string,
  error: string,
) => {
  await writeRecord(byJobKey(jobId), {
    jobId,
    accountId,
    state: 'error',
    error,
  });
};

/**
 * Resolve the record for a job, or `null` when no record exists yet (the job
 * has not started — the caller reports "not-found"). A `ready` record whose
 * archive has expired or been cleaned up is reported as `expired` so the
 * client stops polling and can tell the user to start a new export (instead
 * of treating it as still building forever).
 */
export const getExportByJob = async (
  jobId: string,
): Promise<ExportRecord | null> => {
  const record = await readRecord<ExportRecord>(byJobKey(jobId));
  if (!record) return null;
  if (record.state === 'ready') {
    const stillThere = record.path
      ? await stat(record.path).then(
          (s) => s.isFile(),
          () => false,
        )
      : false;
    const expired = record.expiresAt
      ? Date.parse(record.expiresAt) < Date.now()
      : false;
    // Past the TTL, or the archive was reclaimed by the cleanup sweep: the
    // token no longer works and the user must start a new export.
    if (expired || !stillThere) return { ...record, state: 'expired' };
  }
  return record;
};

/**
 * Resolve a download record from its one-time token. The token itself is the
 * credential (random, single-use, 7-day TTL) — possession authorizes the
 * download. Returns `null` when the token is unknown, expired, or its file is
 * gone.
 */
export const resolveDownloadByToken = async (
  token: string,
): Promise<ExportRecord | null> => {
  const record = await readRecord<ExportRecord>(byTokenKey(token));
  if (!record || record.state !== 'ready') return null;
  if (record.expiresAt && Date.parse(record.expiresAt) < Date.now()) {
    return null;
  }
  const exists = record.path
    ? await stat(record.path).then(
        (s) => s.isFile(),
        () => false,
      )
    : false;
  if (!exists) return null;
  return record;
};

/** Invalidate a token after a successful download (one-time link). */
export const invalidateToken = async (token: string) => {
  const redis = await getSharedConnection();
  await redis.del(byTokenKey(token)).catch(() => {});
};

/**
 * Delete export artifacts (zips and their staging dirs) that are past the
 * TTL. An artifact whose job record is gone, no longer `ready`, or older
 * than the TTL is reclaimed. Runs on a schedule.
 */
export const cleanupExpiredExports =
  async (): Promise<AccountExportCleanupResult> => {
    const dir = await exportDir();
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      return { removed: 0 };
    }
    let removed = 0;
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const statMaybe = await stat(full).catch(() => undefined);
      if (!statMaybe) continue;
      const age = Date.now() - statMaybe.mtimeMs;
      if (age < EXPORT_TTL_MS) continue;
      await rm(full, { recursive: true, force: true }).catch(() => {});
      removed += 1;
    }
    if (removed > 0) log.info(`Export cleanup removed ${removed} item(s)`);
    return { removed };
  };

/** Ensure the exports directory exists. */
export const ensureExportDir = async (): Promise<string> => {
  const dir = await exportDir();
  await mkdir(dir, { recursive: true });
  return dir;
};
