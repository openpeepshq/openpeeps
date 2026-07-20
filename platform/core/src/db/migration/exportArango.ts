import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aql, Database } from 'arangojs';
import { collectionInfos } from '../pg/collections';
import { logger } from '../../log';
import {
  arangoConfig,
  collectionFilePath,
  collectionsDir,
  exportDirFromEnv,
  sortedChecksum,
  writeManifest,
  type MigrationManifest,
} from './shared';

const log = logger('core:migration:export');

export const connectArango = () => new Database(arangoConfig());

export const exportArango = async (exportDir = exportDirFromEnv()) => {
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
