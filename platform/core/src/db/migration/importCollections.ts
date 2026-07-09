import { appendFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { getTableName, sql, type Table } from 'drizzle-orm';
import { logger } from '../../log';
import { pgDb } from '../pg/client';
import { runMigrations } from '../pg/migrate';
import {
  documentRegistry,
  edgeRegistry,
  getTableForCollection,
} from '../pg/map/registry';
import {
  arangoDocToDocumentRow,
  arangoDocToEdgeRow,
  buildPostCreatorIdByPostId,
  type ImportContext,
  isEdgeCollection,
} from './transform';
import {
  BATCH_SIZE,
  DOCUMENT_IMPORT_ORDER,
  EDGE_IMPORT_ORDER,
  readJsonl,
} from './shared';

const log = logger('core:db:import');

const rowDedupeKey = (row: Record<string, unknown>): string | undefined => {
  const key = row.id ?? row.key;
  return typeof key === 'string' ? key : undefined;
};

/** Arango exports can contain duplicate _key lines; keep the last row per id. */
export const dedupeRowsById = <T extends Record<string, unknown>>(
  rows: T[],
): T[] => {
  const byKey = new Map<string, T>();
  const withoutKey: T[] = [];

  for (const row of rows) {
    const key = rowDedupeKey(row);
    if (key) {
      byKey.set(key, row);
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

  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${tableNames.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
};

const documentRowIsImportable = (
  collection: string,
  row: Record<string, unknown>,
) => {
  if (collection === 'posts' && !row.creatorId) {
    log.warn('Skipping post %s: missing creatorId', row.id);
    return false;
  }
  if (collection === 'jamEvents' && !row.postId) {
    log.warn('Skipping jam event %s: missing postId', row.id);
    return false;
  }
  if (collection === 'profileSettings' && !row.profileId) {
    log.warn('Skipping profile settings %s: missing profileId', row.id);
    return false;
  }
  return true;
};

export const importArangoCollection = async (
  collection: string,
  collectionsDir: string,
  context: ImportContext = {},
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

  const docs = await readJsonl(filePath);
  if (docs.length === 0) {
    return 0;
  }

  const table = getTableForCollection(collection);
  const db = pgDb();
  const mapped = docs
    .map((doc) =>
      isEdgeCollection(collection)
        ? arangoDocToEdgeRow(collection, doc)
        : arangoDocToDocumentRow(collection, doc, context),
    )
    .filter((row) => documentRowIsImportable(collection, row));
  const rows = dedupeRowsById(mapped);

  if (rows.length < mapped.length) {
    log.warn(
      'Dropped %d duplicate row(s) while importing %s',
      mapped.length - rows.length,
      collection,
    );
  }

  if (rows.length === 0) {
    return 0;
  }

  let imported = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await db.insert(table as never).values(batch as never);
    imported += batch.length;
  }

  log.info('Imported %d rows into %s from Arango JSONL', imported, collection);
  return imported;
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

  const rows = dedupeRowsById(mapped);
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

export const importAllArangoCollections = async (collectionsDir: string) => {
  await runMigrations();
  await truncateAllTables();

  const imported: Record<string, number> = {};
  const context: ImportContext = {
    postCreatorIdByPostId: await buildPostCreatorIdByPostId(collectionsDir),
  };

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    imported[collection] = await importArangoCollection(
      collection,
      collectionsDir,
      context,
    );
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    imported[collection] = await importArangoCollection(
      collection,
      collectionsDir,
      context,
    );
  }

  const total = sumImported(imported);
  log.info(
    'Arango JSONL import complete: %d rows across %d collections',
    total,
    Object.keys(imported).filter((key) => imported[key] > 0).length,
  );

  return { imported, total };
};

export const importAllPostgresCollections = async (collectionsDir: string) => {
  await runMigrations();
  await truncateAllTables();

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
