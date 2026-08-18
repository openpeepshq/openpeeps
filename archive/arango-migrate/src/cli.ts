#!/usr/bin/env node
import { aql, Database } from 'arangojs';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { logger } from '@openpeepshq/core/log';
import {
  collectionFilePath,
  collectionInfos,
  collectionsDir,
  exportDirFromEnv,
  importPostgres,
  sortedChecksum,
  validateMigration,
  writeManifest,
  type MigrationManifest,
} from '@openpeepshq/core/migration';

dotenv.config();

const log = logger('archive:arango-migrate');

const arangoConfig = () => ({
  url: process.env.DB_URL ?? 'http://localhost:8529',
  databaseName: process.env.DB_NAME,
});

const connectArango = () => new Database(arangoConfig());

const exportArango = async (exportDir = exportDirFromEnv()) => {
  const config = arangoConfig();
  const db = connectArango();
  log.info(
    'Exporting ArangoDB from %s (database: %s)',
    config.url,
    config.databaseName ?? 'default',
  );

  await mkdir(collectionsDir(exportDir), { recursive: true });
  await writeFile(
    join(exportDir, 'collectionInfos.json'),
    JSON.stringify(collectionInfos, null, 2),
  );

  const collections: Record<string, number> = {};
  const accountEmails: string[] = [];
  const postIds: string[] = [];

  for (const collectionInfo of Object.values(collectionInfos)) {
    const collectionName = collectionInfo.name;
    const filePath = collectionFilePath(exportDir, collectionName);

    if (!(await db.collection(collectionName).exists())) {
      log.info('Skipping missing collection %s', collectionName);
      collections[collectionName] = 0;
      continue;
    }

    log.info('Exporting collection %s', collectionName);
    let count = 0;
    const cursor = await db.query(aql`
      FOR doc IN ${db.collection(collectionName)}
      RETURN doc
    `);

    for await (const doc of cursor) {
      const record = doc as Record<string, unknown>;
      await appendFile(filePath, `${JSON.stringify(record)}\n`);
      count++;

      if (collectionName === 'accounts' && typeof record.email === 'string') {
        accountEmails.push(record.email);
      }
      if (collectionName === 'posts' && typeof record._key === 'string') {
        postIds.push(record._key);
      }
    }

    collections[collectionName] = count;
    log.info('Exported %d documents from %s', count, collectionName);
  }

  const manifest: MigrationManifest = {
    exportedAt: new Date().toISOString(),
    dbUrl: config.url,
    dbName: config.databaseName,
    collections,
    checksums: {
      accountEmails: sortedChecksum(accountEmails),
      postIds: sortedChecksum(postIds),
    },
  };

  await writeManifest(exportDir, manifest);
  log.info('Export complete: %s', exportDir);
  return manifest;
};

const usage = () => {
  console.log(`Usage: arango-migrate <command>

ARCHIVE: Arango → Postgres cutover. Not part of the OpenPeeps runtime.

Commands:
  export    Export ArangoDB collections to JSONL (DB_URL, DB_NAME)
  import    Import export into Postgres (DATABASE_URL)
  validate  Compare Postgres to import-stats.json (or export manifest)

Environment:
  MIGRATION_EXPORT_DIR  Export directory (default: ./arango-export)
  DB_URL                Arango server URL (default: http://localhost:8529)
  DB_NAME               Arango database name
  DATABASE_URL          Postgres connection string
`);
};

export const runCli = async (argv = process.argv.slice(2)) => {
  const [command] = argv;
  const exportDir = exportDirFromEnv();

  switch (command) {
    case 'export': {
      await exportArango(exportDir);
      return 0;
    }
    case 'import': {
      await importPostgres(exportDir);
      return 0;
    }
    case 'validate': {
      const result = await validateMigration(exportDir);
      return result.ok ? 0 : 1;
    }
    default:
      usage();
      if (command) {
        log.error('Unknown command: %s', command);
        return 1;
      }
      return 1;
  }
};

runCli()
  .then((code) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  })
  .catch((err: unknown) => {
    log.error('Migration CLI failed', err);
    process.exitCode = 1;
  });
