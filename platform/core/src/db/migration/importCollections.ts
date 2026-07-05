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
  isEdgeCollection,
} from './transform';
import {
  BATCH_SIZE,
  DOCUMENT_IMPORT_ORDER,
  EDGE_IMPORT_ORDER,
  readJsonl,
} from './shared';

const log = logger('core:db:import');

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

export const importArangoCollection = async (
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

  const docs = await readJsonl(filePath);
  if (docs.length === 0) {
    return 0;
  }

  const table = getTableForCollection(collection);
  const db = pgDb();
  let imported = 0;

  for (let offset = 0; offset < docs.length; offset += BATCH_SIZE) {
    const batch = docs.slice(offset, offset + BATCH_SIZE);
    const rows = batch.map((doc) =>
      isEdgeCollection(collection)
        ? arangoDocToEdgeRow(collection, doc)
        : arangoDocToDocumentRow(collection, doc),
    );

    await db.insert(table as never).values(rows as never);
    imported += rows.length;

    // #region agent log
    if (collection === 'configs' && offset === 0 && rows.length > 0) {
      const sample = rows[0] as Record<string, unknown>;
      fetch('http://127.0.0.1:7499/ingest/27c2d08d-4470-4015-abd2-33d1e0e3ecd8', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'a0a46a',
        },
        body: JSON.stringify({
          sessionId: 'a0a46a',
          runId: 'post-fix',
          hypothesisId: 'H3',
          location: 'importCollections.ts:importArangoCollection',
          message: 'configs batch insert sample',
          data: {
            rowCount: rows.length,
            sampleKey: sample.key,
            sampleCreatedAt: sample.createdAt,
            sampleUpdatedAt: sample.updatedAt,
            sampleDeletedAt: sample.deletedAt,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
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

  const rows = await readJsonl(filePath);
  if (rows.length === 0) {
    return 0;
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

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    imported[collection] = await importArangoCollection(
      collection,
      collectionsDir,
    );
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    imported[collection] = await importArangoCollection(
      collection,
      collectionsDir,
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
