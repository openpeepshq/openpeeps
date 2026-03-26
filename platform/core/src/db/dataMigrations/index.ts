import { Database } from 'arangojs';

import { dataMigrations } from './migrations';
import { logger } from '../../log';
import { cleanupEdges } from './cleanup';

const log = logger('db:dataMigrations');

export const runDataMigrations = async (database: Database) => {
  for (const migration of dataMigrations) {
    if (
      await database.collection('dataMigrations').documentExists(migration.key)
    ) {
      log.info(`Skipping data migration ${migration.info} (${migration.key}).`);
      continue;
    }
    log.info(`Running data migration ${migration.info} (${migration.key}) ...`);
    await migration.migration(database);
    await database.collection('dataMigrations').save({ _key: migration.key });
  }
  await cleanupEdges(database);
};
