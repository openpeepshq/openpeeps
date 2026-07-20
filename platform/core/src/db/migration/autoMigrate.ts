import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../../log';
import { arangoHasSourceData, isPostgresEmpty } from './detect';
import { exportArango } from './exportArango';
import { importPostgres } from './importPostgres';
import { validateMigration } from './validate';

const log = logger('core:migration:auto');

const autoMigrateEnabled = () =>
  process.env.AUTO_MIGRATE_FROM_ARANGO !== 'false';

export const maybeAutoMigrateFromArango = async () => {
  if (!autoMigrateEnabled()) {
    log.info('Automatic Arango → Postgres migration is disabled');
    return;
  }

  if (!(await isPostgresEmpty())) {
    return;
  }

  if (!(await arangoHasSourceData())) {
    log.info(
      'Postgres is empty and no Arango source data was found; skipping auto migration',
    );
    return;
  }

  const exportDir = await mkdtemp(join(tmpdir(), 'openpeeps-arango-export-'));

  log.info(
    'Postgres is empty and Arango has data; starting automatic migration (export dir: %s)',
    exportDir,
  );

  try {
    await exportArango(exportDir);
    await importPostgres(exportDir, { closeConnection: false });
    const result = await validateMigration(exportDir, {
      closeConnection: false,
    });

    if (!result.ok) {
      throw new Error(
        `Automatic Arango → Postgres migration failed validation (${result.issues.length} issue(s))`,
      );
    }

    log.info('Automatic Arango → Postgres migration completed successfully');
  } finally {
    await rm(exportDir, { recursive: true, force: true }).catch((err) => {
      log.warn(
        'Failed to remove temporary export directory %s',
        exportDir,
        err,
      );
    });
  }
};
