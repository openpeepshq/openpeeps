import { existsSync } from 'node:fs';
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

const resetAndMigrate = async (reason: string) => {
  log.warn('%s; resetting public + drizzle schemas and remigrating', reason);
  await resetPostgresSchemas();
  await applyMigrations();
};

/**
 * Apply Drizzle migrations. Heals half-wiped DBs where the journal and
 * `public` schema disagree (orphan types, missing tables, etc.).
 *
 * Concurrent starters often hit duplicate_table / pg_type conflicts; if app
 * tables already exist we must NOT reset — that would DROP SCHEMA under the
 * other process mid-import.
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
