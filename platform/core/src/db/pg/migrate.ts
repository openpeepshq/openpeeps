import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTableName, sql, type Table } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { logger } from '../../log';
import { pgDb, resetPostgresSchemas } from './client';
import { getTableForCollection } from './map/registry';
import { DOCUMENT_IMPORT_ORDER, EDGE_IMPORT_ORDER } from '../migration/shared';

const log = logger('openpeeps:pg:migrate');

const moduleDir = dirname(fileURLToPath(import.meta.url));

const resolveMigrationsFolder = () => {
  const besideModule = join(moduleDir, 'sql');
  if (existsSync(besideModule)) {
    return besideModule;
  }
  return join(moduleDir, '..', '..', '..', 'src', 'db', 'pg', 'sql');
};

const migrationsFolder = resolveMigrationsFolder();

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type MigrationJournal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

const readMigrationJournal = (): MigrationJournal => {
  const journalPath = join(migrationsFolder, 'meta', '_journal.json');
  return JSON.parse(readFileSync(journalPath, 'utf8')) as MigrationJournal;
};

/** Drizzle journal tags in apply order (e.g. `0000_bizarre_chat`). */
export const listSchemaVersions = (): string[] =>
  readMigrationJournal().entries.map((entry) => entry.tag);

export const getFirstSchemaVersion = (): string => {
  const tags = listSchemaVersions();
  const first = tags[0];
  if (!first) {
    throw new Error('No Postgres schema migrations found');
  }
  return first;
};

export const getLatestSchemaVersion = (): string => {
  const tags = listSchemaVersions();
  const latest = tags[tags.length - 1];
  if (!latest) {
    throw new Error('No Postgres schema migrations found');
  }
  return latest;
};

/**
 * Postgres backups created before `schemaVersion` was stamped assumed this
 * journal tag (see `sql/meta/0006_snapshot.json`).
 */
export const LEGACY_POSTGRES_BACKUP_SCHEMA_VERSION = '0006_fine_trish_tilby';

const assertKnownSchemaVersion = (tag: string): string => {
  if (!listSchemaVersions().includes(tag)) {
    throw new Error(
      `Unknown Postgres schema version "${tag}"; known: ${listSchemaVersions().join(', ')}`,
    );
  }
  return tag;
};

/**
 * Schema to apply before JSONL import on restore.
 * - Arango → first journal tag so later SQL data migrations see restored rows.
 * - Postgres with `schemaVersion` → that tag (must still exist in this binary).
 * - Postgres without → `0006_fine_trish_tilby` (pre-stamping baseline).
 */
export const resolveRestoreSchemaVersion = (
  databaseType: 'arango' | 'postgres',
  schemaVersion?: string,
): string => {
  if (databaseType === 'arango') {
    return getFirstSchemaVersion();
  }
  if (schemaVersion) {
    return assertKnownSchemaVersion(schemaVersion);
  }
  return assertKnownSchemaVersion(LEGACY_POSTGRES_BACKUP_SCHEMA_VERSION);
};

const buildMigrationsFolderUpTo = async (tag: string): Promise<string> => {
  const journal = readMigrationJournal();
  const endIdx = journal.entries.findIndex((entry) => entry.tag === tag);
  if (endIdx < 0) {
    throw new Error(`Unknown Postgres schema version: ${tag}`);
  }

  const entries = journal.entries.slice(0, endIdx + 1);
  const folder = await mkdtemp(join(tmpdir(), 'op-migrate-'));
  await mkdir(join(folder, 'meta'), { recursive: true });
  await writeFile(
    join(folder, 'meta', '_journal.json'),
    `${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
  );
  for (const entry of entries) {
    copyFileSync(
      join(migrationsFolder, `${entry.tag}.sql`),
      join(folder, `${entry.tag}.sql`),
    );
  }
  return folder;
};

/** Apply Drizzle migrations only through `tag` (inclusive). */
export const migrateToSchemaVersion = async (tag: string) => {
  const folder = await buildMigrationsFolderUpTo(tag);
  try {
    await ensurePublicSchema();
    await migrate(pgDb(), { migrationsFolder: folder });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
};

/**
 * Wipe public + drizzle schemas, then migrate through `tag`.
 * Used by backup restore so import lands on a known schema version.
 */
export const resetAndMigrateToSchemaVersion = async (tag: string) => {
  log.info('Resetting Postgres schemas and migrating to %s', tag);
  await resetPostgresSchemas();
  await migrateToSchemaVersion(tag);
  log.info('Postgres schema ready at %s', tag);
};

const APP_TABLE_NAMES = [
  ...DOCUMENT_IMPORT_ORDER.map((collection) =>
    getTableName(getTableForCollection(collection) as Table),
  ),
  ...EDGE_IMPORT_ORDER.map((collection) =>
    getTableName(getTableForCollection(collection) as Table),
  ),
];

const tableExists = async (tableName: string): Promise<boolean> => {
  const db = pgDb();
  const result = await db.execute<{ regclass: string | null }>(
    sql.raw(`SELECT to_regclass('public.${tableName}')::text AS regclass`),
  );
  return result.rows[0]?.regclass != null;
};

const missingAppTables = async (): Promise<string[]> => {
  const missing: string[] = [];
  for (const tableName of APP_TABLE_NAMES) {
    if (!(await tableExists(tableName))) {
      missing.push(tableName);
    }
  }
  return missing;
};

const ensurePublicSchema = async () => {
  const db = pgDb();
  await db.execute(sql.raw('CREATE SCHEMA IF NOT EXISTS public'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO CURRENT_USER'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO public'));
  await db.execute(sql.raw('SET search_path TO public'));
};

/** pg_type / relation conflicts from a half-wiped or concurrent migrate. */
const isSchemaConflictError = (err: unknown): boolean => {
  const candidates = [
    err,
    err && typeof err === 'object' && 'cause' in err
      ? (err as { cause: unknown }).cause
      : undefined,
  ];
  return candidates.some((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }
    const code = (candidate as { code?: unknown }).code;
    // 23505 unique_violation (e.g. orphan composite type in pg_type)
    // 42P07 duplicate_table
    // 3F000 invalid_schema_name (stale search_path after DROP public)
    return code === '23505' || code === '42P07' || code === '3F000';
  });
};

const applyMigrations = async () => {
  await ensurePublicSchema();
  await migrate(pgDb(), { migrationsFolder });
};

const postgresHasAppData = async (): Promise<boolean> => {
  const db = pgDb();
  for (const tableName of APP_TABLE_NAMES) {
    if (!(await tableExists(tableName))) {
      continue;
    }
    const result = await db.execute(
      sql.raw(`SELECT 1 FROM "${tableName}" LIMIT 1`),
    );
    if (result.rows.length > 0) {
      return true;
    }
  }
  return false;
};

const resetAndMigrate = async (reason: string) => {
  if (await postgresHasAppData()) {
    throw new Error(
      `${reason}; refusing to DROP SCHEMA because Postgres already has application data`,
    );
  }
  log.warn('%s; resetting public + drizzle schemas and remigrating', reason);
  await resetPostgresSchemas();
  await applyMigrations();
};

/** Fail if app tables are missing (used when RUN_DB_MIGRATE_ON_BOOT=false). */
export const assertSchemaReady = async () => {
  const missing = await missingAppTables();
  if (missing.length > 0) {
    throw new Error(
      `Postgres schema incomplete (missing: ${missing.join(', ')}); run migrate job first`,
    );
  }
};

/**
 * Apply Drizzle migrations. Heals half-wiped DBs where the journal and
 * `public` schema disagree (orphan types, missing tables, etc.).
 *
 * Concurrent starters often hit duplicate_table / pg_type conflicts; if app
 * tables already exist we must NOT reset — that would DROP SCHEMA under the
 * other process mid-import. Also refuses reset when application data exists.
 *
 * Callers that may race (initPostgres, auto-migrate) must hold
 * SCHEMA_MIGRATE_LOCK around this function.
 */
export const runMigrations = async () => {
  log.info('Running Postgres migrations from %s', migrationsFolder);

  try {
    await applyMigrations();
  } catch (err) {
    if (!isSchemaConflictError(err)) {
      throw err;
    }
    const missing = await missingAppTables();
    if (missing.length === 0) {
      log.warn(
        'Postgres migrate hit a schema conflict but app tables exist (likely a concurrent migrator); continuing',
      );
    } else {
      await resetAndMigrate(
        `Postgres migrate hit a schema conflict and tables are missing (${missing.join(', ')})`,
      );
    }
  }

  const missing = await missingAppTables();
  if (missing.length > 0) {
    await resetAndMigrate(
      `App tables missing after migrate (${missing.join(', ')})`,
    );
  }

  const stillMissing = await missingAppTables();
  if (stillMissing.length > 0) {
    throw new Error(
      `Postgres migrations completed but tables still missing: ${stillMissing.join(', ')}`,
    );
  }

  log.info('Postgres migrations complete');
};
