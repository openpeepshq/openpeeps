import { mkdtemp, rm, writeFile, access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../../log';
import { wipePostgresDatabase } from '../pg/client';
import { arangoHasSourceData, isPostgresEmpty } from './detect';
import { exportArango } from './exportArango';
import { importPostgres } from './importPostgres';
import { validateMigration } from './validate';

const log = logger('core:migration:auto');

const autoMigrateEnabled = () =>
  process.env.AUTO_MIGRATE_FROM_ARANGO !== 'false';

export const autoMigrateFailureMarkerPath = () =>
  process.env.AUTO_MIGRATE_FAILURE_MARKER ||
  // Ephemeral container path (not on apatlogs/apatfiles volumes) so a
  // replaced/updated container retries migration automatically.
  join(tmpdir(), 'openpeeps-auto-migrate-from-arango.failed');

const markerExists = async (path: string) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/** Stay alive so Docker `restart: always` does not retry a failed migration. */
const idleForever = async (message: string) => {
  log.error(message);
  // A bare pending Promise does not keep Node's event loop alive — schedule a
  // timer so the process does not exit(0) and get restarted by Docker.
  await new Promise<never>(() => {
    setInterval(() => undefined, 60_000);
  });
};

const recordFailureAndHalt = async (err: unknown) => {
  const marker = autoMigrateFailureMarkerPath();
  const detail =
    err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);

  try {
    await wipePostgresDatabase();
  } catch (wipeErr) {
    log.error('Failed to wipe Postgres after auto-migration failure', wipeErr);
  }

  try {
    await writeFile(
      marker,
      `Automatic Arango → Postgres migration failed at ${new Date().toISOString()}\n\n${detail}\n`,
      'utf8',
    );
    log.error(
      'Wrote auto-migration failure marker to %s (remove it to retry after fixing data)',
      marker,
    );
  } catch (markerErr) {
    log.error(
      'Failed to write auto-migration failure marker to %s',
      marker,
      markerErr,
    );
  }

  await idleForever(
    'Automatic Arango → Postgres migration failed; Postgres was wiped and this process will idle. Redeploy/replace the container (or remove the ephemeral failure marker) to retry.',
  );
};

export const maybeAutoMigrateFromArango = async () => {
  if (!autoMigrateEnabled()) {
    log.info('Automatic Arango → Postgres migration is disabled');
    return;
  }

  const marker = autoMigrateFailureMarkerPath();
  if (await markerExists(marker)) {
    const previous = await readFile(marker, 'utf8').catch(() => '');
    await idleForever(
      `Previous automatic Arango → Postgres migration failed. Marker: ${marker}\n${previous}`,
    );
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
  } catch (err) {
    await recordFailureAndHalt(err);
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
