import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { getTableName, sql, type Table } from 'drizzle-orm';
import { logger } from '../../log';
import { closePostgres, pgDb } from '../pg/client';
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
  assertExportDir,
  BATCH_SIZE,
  collectionFilePath,
  DOCUMENT_IMPORT_ORDER,
  EDGE_IMPORT_ORDER,
  exportDirFromEnv,
  readJsonl,
  readManifest,
} from './shared';

const log = logger('core:migration:import');

const importCollection = async (
  collection: string,
  exportDir: string,
): Promise<number> => {
  const filePath = collectionFilePath(exportDir, collection);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    log.info('Skipping collection %s (no export file)', collection);
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
  }

  log.info('Imported %d rows into %s', imported, collection);
  return imported;
};

const truncateMigrationTables = async () => {
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

export const importPostgres = async (exportDir = exportDirFromEnv()) => {
  await assertExportDir(exportDir);
  const manifest = await readManifest(exportDir);
  log.info(
    'Importing export from %s (exported %s)',
    exportDir,
    manifest.exportedAt,
  );

  await runMigrations();
  await truncateMigrationTables();

  const imported: Record<string, number> = {};

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    imported[collection] = await importCollection(collection, exportDir);
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    imported[collection] = await importCollection(collection, exportDir);
  }

  const total = Object.values(imported).reduce((sum, count) => sum + count, 0);
  log.info(
    'Import complete: %d rows across %d collections',
    total,
    Object.keys(imported).length,
  );

  await closePostgres();
  return imported;
};
