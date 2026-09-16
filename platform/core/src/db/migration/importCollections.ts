import { randomUUID } from 'node:crypto';
import { appendFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { getTableColumns, getTableName, sql, type Table } from 'drizzle-orm';
import { logger } from '../../log';
import { pgDb } from '../pg/client';
import {
  resetAndMigrateToSchemaVersion,
  resolveRestoreSchemaVersion,
  runMigrations,
} from '../pg/migrate';
import {
  documentRegistry,
  edgeRegistry,
  getTableForCollection,
  isEdgeCollection,
} from '../pg/map/registry';
import {
  BATCH_SIZE,
  DOCUMENT_IMPORT_ORDER,
  EDGE_IMPORT_ORDER,
  readJsonl,
} from './shared';

const log = logger('core:db:import');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeImportId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

const rowDedupeKey = (row: Record<string, unknown>): string | undefined =>
  normalizeImportId(row.id ?? row.key);

/** Keep the last row per id when a JSONL file repeats keys. */
export const dedupeRowsById = <T extends Record<string, unknown>>(
  rows: T[],
): T[] => {
  const byKey = new Map<string, T>();
  const withoutKey: T[] = [];

  for (const row of rows) {
    const key = rowDedupeKey(row);
    if (key) {
      byKey.set(key, typeof row.id === 'string' ? { ...row, id: key } : row);
    } else {
      withoutKey.push(row);
    }
  }

  return [...byKey.values(), ...withoutKey];
};

export const collectionJsonlPath = (
  collectionsDir: string,
  collection: string,
) => join(collectionsDir, `${collection}.jsonl`);

const isKnownCollection = (collection: string) =>
  collection in documentRegistry || collection in edgeRegistry;

export const truncateAllTables = async () => {
  const db = pgDb();
  const tableNames = [
    ...EDGE_IMPORT_ORDER.map((collection) =>
      getTableName(edgeRegistry[collection].table as Table),
    ),
    ...[...DOCUMENT_IMPORT_ORDER]
      .reverse()
      .map((collection) =>
        getTableName(documentRegistry[collection].table as Table),
      ),
  ];

  const existing: string[] = [];
  for (const name of tableNames) {
    const result = await db.execute<{ regclass: string | null }>(
      sql.raw(`SELECT to_regclass('public.${name}')::text AS regclass`),
    );
    if (result.rows[0]?.regclass != null) {
      existing.push(name);
    }
  }

  if (existing.length === 0) {
    return;
  }

  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${existing.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
};

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const ensureEdgeUuidId = (
  collection: string,
  row: Record<string, unknown>,
): Record<string, unknown> => {
  if (!isEdgeCollection(collection)) {
    return row;
  }
  if (isUuid(row.id)) {
    const normalized = normalizeImportId(row.id) ?? String(row.id);
    return normalized === row.id ? row : { ...row, id: normalized };
  }
  const next = { ...row, id: randomUUID() };
  log.warn(
    'Replaced non-UUID %s edge id %s with %s',
    collection,
    String(row.id),
    next.id,
  );
  return next;
};

export const importPostgresRowCollection = async (
  collection: string,
  collectionsDir: string,
): Promise<number> => {
  if (!isKnownCollection(collection)) {
    return 0;
  }

  const filePath = collectionJsonlPath(collectionsDir, collection);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return 0;
  }

  const mapped = await readJsonl(filePath);
  if (mapped.length === 0) {
    return 0;
  }

  const withValidIds = mapped.map((row) => ensureEdgeUuidId(collection, row));
  const rows = dedupeRowsById(withValidIds);
  if (rows.length < mapped.length) {
    log.warn(
      'Dropped %d duplicate row(s) while importing %s',
      mapped.length - rows.length,
      collection,
    );
  }

  const table = getTableForCollection(collection);
  const db = pgDb();
  let imported = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await db.insert(table as never).values(batch as never);
    imported += batch.length;
  }

  log.info(
    'Imported %d rows into %s from Postgres JSONL',
    imported,
    collection,
  );
  return imported;
};

const sumImported = (imported: Record<string, number>) =>
  Object.values(imported).reduce((sum, count) => sum + count, 0);

export type PlaceholderColumn = { table: string; column: string };

const liveColumnNames = async (table: string): Promise<Set<string>> => {
  const result = await pgDb().execute<{ column_name: string }>(
    sql`SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}`,
  );
  return new Set(result.rows.map((row) => row.column_name));
};

/**
 * A restore loads rows at an older schema version, but Drizzle names every
 * column of the current table objects in its INSERT, so a column a later
 * migration adds (e.g. `search_vector` in 0001) breaks the load. Add those as
 * nullable placeholders and drop them again before migrating forward, so the
 * migration still creates them itself and runs its backfill.
 */
const addPlaceholderColumns = async (): Promise<PlaceholderColumn[]> => {
  const db = pgDb();
  const added: PlaceholderColumn[] = [];

  for (const collection of [...DOCUMENT_IMPORT_ORDER, ...EDGE_IMPORT_ORDER]) {
    const table = getTableForCollection(collection) as Table;
    const tableName = getTableName(table);
    const live = await liveColumnNames(tableName);
    if (live.size === 0) {
      continue;
    }
    for (const column of Object.values(getTableColumns(table))) {
      if (live.has(column.name)) {
        continue;
      }
      await db.execute(
        sql.raw(
          `ALTER TABLE "${tableName}" ADD COLUMN "${column.name}" ${column.getSQLType()}`,
        ),
      );
      added.push({ table: tableName, column: column.name });
    }
  }

  if (added.length > 0) {
    log.info(
      'Added %d placeholder column(s) for the restore: %s',
      added.length,
      added.map(({ table, column }) => `${table}.${column}`).join(', '),
    );
  }
  return added;
};

const dropPlaceholderColumns = async (columns: PlaceholderColumn[]) => {
  for (const { table, column } of columns) {
    await pgDb().execute(
      sql.raw(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`),
    );
  }
};

const prepareSchemaForRestore = async (
  schemaVersionFromBackup?: string,
): Promise<PlaceholderColumn[]> => {
  const schemaVersion = resolveRestoreSchemaVersion(schemaVersionFromBackup);
  log.info('Preparing postgres restore at schema %s', schemaVersion);
  await resetAndMigrateToSchemaVersion(schemaVersion);
  // 0006 added a unique (from_id, to_id) on post_seen; that was wrong for
  // impressions. Drop it before import so pre-0007 backups with duplicate
  // view rows can restore. 0007 (and later) drop it permanently.
  await pgDb().execute(
    sql.raw('DROP INDEX IF EXISTS "post_seen_from_to_unique"'),
  );
  await truncateAllTables();
  return addPlaceholderColumns();
};

export const importAllPostgresCollections = async (
  collectionsDir: string,
  schemaVersionFromBackup?: string,
) => {
  const placeholders = await prepareSchemaForRestore(schemaVersionFromBackup);

  const imported: Record<string, number> = {};

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    imported[collection] = await importPostgresRowCollection(
      collection,
      collectionsDir,
    );
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    imported[collection] = await importPostgresRowCollection(
      collection,
      collectionsDir,
    );
  }

  log.info('Postgres rows loaded; ensuring schema is at latest');
  await dropPlaceholderColumns(placeholders);
  await runMigrations();

  const total = sumImported(imported);
  log.info(
    'Postgres JSONL import complete: %d rows across %d collections',
    total,
    Object.keys(imported).filter((key) => imported[key] > 0).length,
  );

  return { imported, total };
};

export const exportAllPostgresCollections = async (collectionsDir: string) => {
  const db = pgDb();
  const collections = [...DOCUMENT_IMPORT_ORDER, ...EDGE_IMPORT_ORDER];

  for (const collection of collections) {
    const table = getTableForCollection(collection);
    const rows = await db.select().from(table as never);

    if (rows.length === 0) {
      continue;
    }

    const filePath = collectionJsonlPath(collectionsDir, collection);
    for (const row of rows) {
      await appendFile(filePath, `${JSON.stringify(row)}\n`);
    }

    log.info('Exported %d rows from %s', rows.length, collection);
  }
};
