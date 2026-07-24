import { logger } from '../../log';
import { closePostgres } from '../pg/client';
import {
  assertExportDir,
  collectionsDir,
  exportDirFromEnv,
  readManifest,
  writeImportStats,
} from './shared';
import { importAllArangoCollections } from './importCollections';

const log = logger('core:migration:import');

export const importPostgres = async (
  exportDir = exportDirFromEnv(),
  options: { closeConnection?: boolean } = {},
) => {
  const closeConnection = options.closeConnection ?? true;
  await assertExportDir(exportDir);
  const manifest = await readManifest(exportDir);
  log.info(
    'Importing export from %s (exported %s)',
    exportDir,
    manifest.exportedAt,
  );

  const { imported } = await importAllArangoCollections(
    collectionsDir(exportDir),
  );
  await writeImportStats(exportDir, imported);

  if (closeConnection) {
    await closePostgres();
  }
  return imported;
};
