import {
  lstat,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { inArray, sql } from 'drizzle-orm';
import { config } from '../config';
import { database } from '../db';
import { mediaAttachments } from '../db/pg/schema/documents';
import type {
  StoredMediaFile,
  StoredMediaStatus,
} from '@openpeepshq/common/types';
import { logger } from '../log';
import { forgetStreamAccess, getStreamLastAccess } from './streaming';

const log = logger('app:media:gc');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a file must stay unreferenced before it is deleted. The clock
 * starts the first time a collection run sees the file with no live link, so
 * the run that ships this job only records files — it does not delete them.
 * In-progress uploads (stored, not yet saved onto a post or recording) survive
 * the same window.
 */
export const MEDIA_GC_GRACE_MS = 7 * DAY_MS;

/**
 * When deleting HLS directories (derived stream caches), skip deletion if the
 * stream was accessed within this window — a viewer may have a live playback
 * session. The HLS segments are cache-only; they will be reclaimed by the next
 * streaming-cleanup run once truly idle.
 */
const STREAM_RECENT_ACCESS_MS = 10 * 60 * 1000;

/** Whether the stream cache for a storage id has been accessed recently.

Fails open (returns false) when Redis is unavailable — deletion should never
block on an inaccessible access log.
 */
const streamIsRecentlyActive = async (
  storageId: string,
  now: number,
): Promise<boolean> => {
  try {
    const lastAccess = await getStreamLastAccess(storageId);
    return lastAccess !== null && lastAccess > now - STREAM_RECENT_ACCESS_MS;
  } catch {
    return false;
  }
};

/** Type alias for the stream-active check, overridable in tests. */
export type StreamActiveChecker = (
  storageId: string,
  now: number,
) => Promise<boolean>;

/** SHA-256 digest, base64url, no padding. */
export const STORAGE_ID_LENGTH = 43;

const STORAGE_ID_RE = /^[A-Za-z0-9_-]{43}$/;

/**
 * POSIX regex (no lookahead) shared with the SQL scan. Matches
 * `/storage/allpeep/<id>/<file>` and `/media/streaming/<id>/...`.
 */
export const STORAGE_URL_SOURCE =
  '/(?:allpeep|media/streaming)/([A-Za-z0-9_-]{43})(?:[^A-Za-z0-9_-]|$)';

const IDENT = /^[a-z_][a-z0-9_]*$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Live content that can embed a media URL. The scan also covers every other
 * public jsonb column, so a new page or plugin table is included without a
 * code change. These are the ones GC refuses to run without.
 */
export const REFERENCE_TABLES = [
  'posts',
  'profiles',
  'groups',
  'configs',
  'jam_recordings',
] as const;

/**
 * Rows that store a media URL but are not a live link:
 * - `media_attachments` is the upload registry. It keeps a copy of every file
 *   URL, including files whose post or recording is already gone.
 * - `entries` snapshots the post at create and edit time. After the post is
 *   deleted those snapshots are the only remaining copy, so counting them
 *   would keep the file forever. The rendered post is the post row itself.
 */
export const EXCLUDED_REFERENCE_TABLES = [
  'media_attachments',
  'entries',
] as const;

const excludedTables = new Set<string>(EXCLUDED_REFERENCE_TABLES);

export const isStorageId = (value: string): boolean =>
  STORAGE_ID_RE.test(value);

/** Quick existence check for the stored source file (without the HLS dir). */
export const mediaFileExists = async (storageId: string): Promise<boolean> => {
  if (!isStorageId(storageId)) return false;
  const layout = await mediaLayout();
  try {
    await stat(join(layout.filesDir, storageId));
    return true;
  } catch (error) {
    if (isEnoent(error)) return false;
    throw error;
  }
};

export const quoteIdent = (name: string): string => {
  if (!IDENT.test(name)) {
    throw new Error(`Refusing to scan unexpected identifier "${name}"`);
  }
  return `"${name}"`;
};

export const extractStorageIds = (text: string): string[] => {
  const ids = new Set<string>();
  for (const match of text.matchAll(new RegExp(STORAGE_URL_SOURCE, 'g'))) {
    const id = match[1];
    if (id && isStorageId(id)) ids.add(id);
  }
  return [...ids];
};

export interface JsonbColumn {
  tableName: string;
  columnName: string;
}

// Perf note: the LIKE pre-filter below can be accelerated on large instances
// by adding a gin_trgm index (pg_trgm extension) on (body::text) for the
// reference tables. Not applied automatically because CREATE EXTENSION requires
// superuser and may be unavailable in hosted Postgres environments.
export const buildReferenceScanSql = (
  columns: JsonbColumn[],
  tablesWithDeletedAt: ReadonlySet<string>,
): string | null => {
  if (STORAGE_URL_SOURCE.includes("'")) {
    throw new Error('Storage URL pattern cannot contain quotes');
  }
  const branches = columns
    .filter((column) => !excludedTables.has(column.tableName))
    .map((column) => {
      const table = `public.${quoteIdent(column.tableName)}`;
      const col = `${table}.${quoteIdent(column.columnName)}`;
      const text = `COALESCE(${col}::text, '')`;
      const liveOnly = tablesWithDeletedAt.has(column.tableName)
        ? `\n  AND ${table}."deleted_at" IS NULL`
        : '';
      // Soft-deleted rows still hold the old URL, but the app renders a
      // tombstone instead of the file. They are not a live link.
      return `SELECT (m.matches)[1] AS storage_id
FROM ${table}
CROSS JOIN LATERAL regexp_matches(${text}, '${STORAGE_URL_SOURCE}', 'g') AS m(matches)
WHERE (${col}::text LIKE '%/allpeep/%' OR ${col}::text LIKE '%/media/streaming/%')${liveOnly}`;
    });
  if (branches.length === 0) return null;
  return `SELECT DISTINCT storage_id FROM (\n${branches.join(
    '\nUNION ALL\n',
  )}\n) refs WHERE storage_id IS NOT NULL`;
};

export interface SqlExecutor {
  execute: (query: string) => Promise<{ rows: Record<string, unknown>[] }>;
}

const stringField = (
  row: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = row[field];
  return typeof value === 'string' ? value : undefined;
};

const COLUMN_SQL = `
SELECT c.table_name, c.column_name
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema
 AND t.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.udt_name = 'jsonb'
  AND ${[...excludedTables]
    .map((table) => `c.table_name <> '${table}'`)
    .join('\n  AND ')}`;

const DELETED_AT_SQL = `
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'deleted_at'`;

const ATTACHMENT_SQL = `
SELECT id::text AS id, body::text AS body
FROM media_attachments
WHERE "deleted_at" IS NULL
  AND (body::text LIKE '%/allpeep/%'
       OR body::text LIKE '%/media/streaming/%')`;

export const loadReferencedStorageIds = async (
  executor: SqlExecutor,
): Promise<Set<string>> => {
  const columnRows = await executor.execute(COLUMN_SQL);
  const columns: JsonbColumn[] = [];
  for (const row of columnRows.rows) {
    const tableName = stringField(row, 'table_name');
    const columnName = stringField(row, 'column_name');
    if (!tableName || !columnName) continue;
    if (excludedTables.has(tableName)) continue;
    quoteIdent(tableName);
    quoteIdent(columnName);
    columns.push({ tableName, columnName });
  }

  const scanned = new Set(columns.map((column) => column.tableName));
  const missing = REFERENCE_TABLES.filter((table) => !scanned.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Media GC refused to run; missing content tables: ${missing.join(', ')}`,
    );
  }

  const deletedAtRows = await executor.execute(DELETED_AT_SQL);
  const tablesWithDeletedAt = new Set<string>();
  for (const row of deletedAtRows.rows) {
    const tableName = stringField(row, 'table_name');
    if (tableName) tablesWithDeletedAt.add(tableName);
  }

  const scanSql = buildReferenceScanSql(columns, tablesWithDeletedAt);
  if (!scanSql) {
    throw new Error('Media GC refused to run; nothing to scan');
  }
  const scannedRows = await executor.execute(scanSql);
  const ids = new Set<string>();
  for (const row of scannedRows.rows) {
    const id = stringField(row, 'storage_id');
    if (id && isStorageId(id)) ids.add(id);
  }
  return ids;
};

export interface AttachmentBody {
  id: string;
  body: string;
}

/**
 * Attachment rows whose local files are all gone. Rows that still point at a
 * file on disk (referenced, or inside the grace window) stay so an in-progress
 * upload can finish.
 */
export const danglingMediaAttachmentIds = (
  rows: AttachmentBody[],
  filesOnDisk: ReadonlySet<string>,
): string[] =>
  rows.flatMap((row) => {
    const ids = extractStorageIds(row.body);
    if (ids.length === 0) return [];
    return ids.every((id) => !filesOnDisk.has(id)) ? [row.id] : [];
  });

export interface SweepOptions {
  filesDir: string;
  hlsRoot: string;
  statePath: string;
  referencedIds: ReadonlySet<string>;
  now?: number;
  graceMs?: number;
  /** Override the recent-access check (default: Redis-backed). */
  streamActiveChecker?: StreamActiveChecker;
}

export interface SweepResult {
  deleted: string[];
  marked: number;
  kept: number;
  skipped: string[];
  remainingIds: string[];
  tempDeleted: number;
  storageMissing: boolean;
}

const emptySweep = (): SweepResult => ({
  deleted: [],
  marked: 0,
  kept: 0,
  skipped: [],
  remainingIds: [],
  tempDeleted: 0,
  storageMissing: false,
});

const isEnoent = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException).code === 'ENOENT';

const readState = async (
  statePath: string,
): Promise<Record<string, number>> => {
  let raw: string;
  try {
    raw = await readFile(statePath, 'utf8');
  } catch (error) {
    if (isEnoent(error)) return {};
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log.warn(`Ignoring unreadable GC state at ${statePath}`);
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  const state: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (
      isStorageId(key) &&
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      state[key] = value;
    }
  }
  return state;
};

const writeState = async (
  statePath: string,
  state: Record<string, number>,
): Promise<void> => {
  const tempPath = `${statePath}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(state));
  await rename(tempPath, statePath);
};

const removeHls = async (hlsRoot: string, storageId: string): Promise<void> => {
  if (!isStorageId(storageId)) return;
  await rm(join(hlsRoot, storageId), { recursive: true, force: true });
};

/**
 * Delete stored files with no live reference, once they have stayed that way
 * for the grace period. Also drops HLS directories for those files, stale
 * upload temps, and HLS directories whose source file is already gone.
 */
export const sweepUnreferencedMedia = async (
  options: SweepOptions,
): Promise<SweepResult> => {
  const now = options.now ?? Date.now();
  const graceMs = options.graceMs ?? MEDIA_GC_GRACE_MS;
  const cutoff = now - graceMs;
  const result = emptySweep();

  let names: string[];
  try {
    names = await readdir(options.filesDir);
  } catch (error) {
    if (isEnoent(error)) {
      result.storageMissing = true;
      return result;
    }
    throw error;
  }

  const previous = await readState(options.statePath);
  const next: Record<string, number> = {};
  const remaining = new Set<string>();
  const doomed: { name: string; fullPath: string; since: number }[] = [];

  for (const name of names) {
    const fullPath = join(options.filesDir, name);
    let stat: Awaited<ReturnType<typeof lstat>>;
    try {
      stat = await lstat(fullPath);
    } catch (error) {
      if (isEnoent(error)) continue;
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      result.skipped.push(name);
      continue;
    }
    if (name.startsWith('.tmp-')) {
      if (stat.mtimeMs <= cutoff) {
        try {
          await unlink(fullPath);
          result.tempDeleted += 1;
        } catch (error) {
          log.error(
            `Failed to delete temp upload ${name}: ${(error as Error).message}`,
          );
        }
      }
      continue;
    }
    if (!isStorageId(name)) {
      result.skipped.push(name);
      continue;
    }
    if (options.referencedIds.has(name)) {
      result.kept += 1;
      remaining.add(name);
      continue;
    }
    const since = previous[name] ?? now;
    if (since > cutoff) {
      next[name] = since;
      remaining.add(name);
      result.marked += 1;
      continue;
    }
    doomed.push({ name, fullPath, since });
  }

  // Persist clocks before unlinking. A crash mid-delete then retries from
  // this state instead of treating a re-linked file as long-unreferenced.
  await writeState(options.statePath, next);
  let deleteFailed = false;
  for (const item of doomed) {
    try {
      await unlink(item.fullPath);
    } catch (error) {
      log.error(
        `Failed to delete unreferenced media ${item.name}: ${(error as Error).message}`,
      );
      next[item.name] = item.since;
      remaining.add(item.name);
      deleteFailed = true;
      continue;
    }
    // Preserve an HLS cache with a recent viewer; streaming cleanup will
    // reclaim it once genuinely idle.
    if (
      await (options.streamActiveChecker ?? streamIsRecentlyActive)(
        item.name,
        now,
      )
    ) {
      log.info(
        `Preserving HLS cache for ${item.name}; stream was accessed recently`,
      );
    } else {
      await removeHls(options.hlsRoot, item.name).catch((error: unknown) => {
        log.error(
          `Failed to delete stream for ${item.name}: ${(error as Error).message}`,
        );
      });
    }
    result.deleted.push(item.name);
  }
  if (deleteFailed) {
    await writeState(options.statePath, next);
  }

  await removeOrphanHls(
    options.hlsRoot,
    options.referencedIds,
    remaining,
    result,
    options.streamActiveChecker ?? streamIsRecentlyActive,
    now,
  );
  result.remainingIds = [...remaining];
  return result;
};

const removeOrphanHls = async (
  hlsRoot: string,
  referencedIds: ReadonlySet<string>,
  filesOnDisk: ReadonlySet<string>,
  result: SweepResult,
  streamActiveChecker: StreamActiveChecker,
  now: number,
): Promise<void> => {
  let names: string[];
  try {
    names = await readdir(hlsRoot);
  } catch (error) {
    if (isEnoent(error)) return;
    throw error;
  }
  for (const name of names) {
    if (!isStorageId(name)) {
      result.skipped.push(name);
      continue;
    }
    if (referencedIds.has(name) || filesOnDisk.has(name)) continue;
    // Preserve an actively-watched stream's HLS cache.
    if (await streamActiveChecker(name, now)) continue;
    const fullPath = join(hlsRoot, name);
    let stat: Awaited<ReturnType<typeof lstat>>;
    try {
      stat = await lstat(fullPath);
    } catch (error) {
      if (isEnoent(error)) continue;
      throw error;
    }
    if (!stat.isDirectory()) {
      result.skipped.push(name);
      continue;
    }
    await rm(fullPath, { recursive: true, force: true }).catch(
      (error: unknown) => {
        log.error(
          `Failed to delete orphan stream ${name}: ${(error as Error).message}`,
        );
      },
    );
  }
};

const defaultExecutor = async (): Promise<SqlExecutor> => {
  const db = await database();
  return {
    execute: async (query: string) => {
      const result = await db.execute(sql.raw(query));
      const rows = Array.isArray(result)
        ? (result as Record<string, unknown>[])
        : result.rows;
      if (!Array.isArray(rows)) {
        throw new Error('Media GC query returned no rows');
      }
      return { rows: rows as Record<string, unknown>[] };
    },
  };
};

const mediaLayout = async () => {
  const { path } = (await config()).media.storage.params;
  return {
    // Same concatenation the openpeeps storage driver uses for the file dir.
    filesDir: `${path}/allpeep`,
    hlsRoot: join(path, 'hls'),
    statePath: join(path, 'gc-unreferenced.json'),
  };
};

const loadAttachmentBodies = async (
  executor: SqlExecutor,
): Promise<AttachmentBody[]> => {
  const result = await executor.execute(ATTACHMENT_SQL);
  return result.rows.flatMap((row) => {
    const id = stringField(row, 'id');
    const body = stringField(row, 'body');
    if (!id || !UUID_RE.test(id) || body === undefined) return [];
    return [{ id, body }];
  });
};

export const deleteMediaAttachmentRows = async (
  ids: string[],
): Promise<number> => {
  const valid = ids.filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return 0;
  const db = await database();
  let deleted = 0;
  const chunkSize = 200;
  for (let index = 0; index < valid.length; index += chunkSize) {
    const chunk = valid.slice(index, index + chunkSize);
    const removed = await db
      .delete(mediaAttachments)
      .where(inArray(mediaAttachments.id, chunk))
      .returning({ id: mediaAttachments.id });
    deleted += removed.length;
  }
  return deleted;
};

export interface MediaGarbageCollectionResult extends SweepResult {
  referenced: number;
  attachmentsDeleted: number;
}

export const collectUnreferencedMedia = async (
  graceMs: number = MEDIA_GC_GRACE_MS,
): Promise<MediaGarbageCollectionResult> => {
  const executor = await defaultExecutor();
  const referencedIds = await loadReferencedStorageIds(executor);
  const sweep = await sweepUnreferencedMedia({
    ...(await mediaLayout()),
    referencedIds,
    graceMs,
  });
  if (sweep.storageMissing) {
    log.warn('Media storage directory is missing; skipping garbage collection');
    return { ...sweep, referenced: referencedIds.size, attachmentsDeleted: 0 };
  }
  const dangling = danglingMediaAttachmentIds(
    await loadAttachmentBodies(executor),
    new Set(sweep.remainingIds),
  );
  const attachmentsDeleted = await deleteMediaAttachmentRows(dangling);
  return { ...sweep, referenced: referencedIds.size, attachmentsDeleted };
};

const statusRank: Record<StoredMediaStatus, number> = {
  due: 0,
  pending: 1,
  unseen: 2,
  referenced: 3,
};

interface ClassifiedMedia {
  status: StoredMediaStatus;
  unreferencedSince: string | null;
  deletesAt: string | null;
}

/** How garbage collection treats one file, given the live link set and clock. */
export const classifyMediaFile = (
  storageId: string,
  referencedIds: ReadonlySet<string>,
  unreferencedSinceMs: number | undefined,
  now: number,
  graceMs: number = MEDIA_GC_GRACE_MS,
): ClassifiedMedia => {
  if (referencedIds.has(storageId)) {
    return { status: 'referenced', unreferencedSince: null, deletesAt: null };
  }
  if (unreferencedSinceMs === undefined) {
    return { status: 'unseen', unreferencedSince: null, deletesAt: null };
  }
  const deletesAtMs = unreferencedSinceMs + graceMs;
  return {
    status: deletesAtMs <= now ? 'due' : 'pending',
    unreferencedSince: new Date(unreferencedSinceMs).toISOString(),
    deletesAt: new Date(deletesAtMs).toISOString(),
  };
};

export const listStoredMedia = async (): Promise<{
  files: StoredMediaFile[];
  graceMs: number;
}> => {
  const executor = await defaultExecutor();
  const referencedIds = await loadReferencedStorageIds(executor);
  const layout = await mediaLayout();
  const state = await readState(layout.statePath);
  const now = Date.now();
  const prefix = (await config()).media.storage.params.prefix;
  let names: string[] = [];
  try {
    names = await readdir(layout.filesDir);
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }

  const files: StoredMediaFile[] = [];
  for (const name of names) {
    if (!isStorageId(name)) continue;
    const fullPath = join(layout.filesDir, name);
    let stat: Awaited<ReturnType<typeof lstat>>;
    try {
      stat = await lstat(fullPath);
    } catch (error) {
      if (isEnoent(error)) continue;
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) continue;
    files.push({
      storageId: name,
      size: stat.size,
      modifiedAt: new Date(stat.mtimeMs).toISOString(),
      url: `${prefix}/allpeep/${name}/file`,
      ...classifyMediaFile(name, referencedIds, state[name], now),
    });
  }
  files.sort(
    (a, b) => statusRank[a.status] - statusRank[b.status] || b.size - a.size,
  );
  return { files, graceMs: MEDIA_GC_GRACE_MS };
};

/**
 * Remove one stored file immediately. The garbage-collection clock and
 * dangling attachment rows are cleaned up too. Live links are left in place
 * and will 404. The HLS cache is preserved if the stream was accessed within
 * the recent-access window; it will be reclaimed by the streaming-cleanup cron.
 */
export const deleteStoredMediaNow = async (
  storageId: string,
): Promise<boolean> => {
  if (!isStorageId(storageId)) return false;
  const layout = await mediaLayout();
  const fullPath = join(layout.filesDir, storageId);
  let removed = false;
  try {
    await unlink(fullPath);
    removed = true;
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  const hlsPath = join(layout.hlsRoot, storageId);
  // Don't tear down an HLS cache that someone is actively watching — the
  // segments will be reclaimed by the streaming-cleanup cron instead.
  const now = Date.now();
  if (!(await streamIsRecentlyActive(storageId, now))) {
    try {
      const stat = await lstat(hlsPath);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        await rm(hlsPath, { recursive: true, force: true });
        removed = true;
      }
    } catch (error) {
      if (!isEnoent(error)) throw error;
    }
  } else {
    log.info(
      `Preserving HLS cache for ${storageId}; stream was accessed recently`,
    );
  }

  const state = await readState(layout.statePath);
  if (storageId in state) {
    const next = { ...state };
    delete next[storageId];
    await writeState(layout.statePath, next);
  }

  const executor = await defaultExecutor();
  let names: string[] = [];
  try {
    names = await readdir(layout.filesDir);
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  const onDisk = new Set(names.filter(isStorageId));
  const rows = await loadAttachmentBodies(executor);
  const attachmentIds = rows.flatMap((row) => {
    const ids = extractStorageIds(row.body);
    if (!ids.includes(storageId)) return [];
    return ids.every((id) => !onDisk.has(id)) ? [row.id] : [];
  });
  await deleteMediaAttachmentRows(attachmentIds);
  await forgetStreamAccess(storageId).catch((error: unknown) => {
    log.warn(
      `Failed to forget stream access for ${storageId}: ${(error as Error).message}`,
    );
  });
  return removed;
};
