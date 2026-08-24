import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  writeFile,
  readFile,
} from 'node:fs/promises';
import { constants, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { emptyDir } from 'fs-extra';
import { join, sep, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import archiver from 'archiver';
import extract from 'extract-zip';
import { collectionInfos } from '../db';
import { communityConfig, config } from '../config';
import {
  exportAllPostgresCollections,
  importAllArangoCollections,
  importAllPostgresCollections,
} from '../db/migration/importCollections';
import { getLatestSchemaVersion } from '../db/pg/migrate';
import { replaceOrigin } from '../db/replaceOrigin';
import { logger } from '../log';
import { setDefaultRoles } from '../roles';
import { serverRootUrl } from '../server';
import {
  resolveBackupDatabaseType,
  type BackupDatabaseType,
  type BackupMetadata,
} from './metadata';

export { resolveBackupDatabaseType } from './metadata';

const log = logger('core:backups');

/** Safety net if extraction stalls (normal 1 GiB restore finishes in a few minutes). */
const EXTRACT_TIMEOUT_MS = 30 * 60 * 1000;

const extractWithUnzipCli = (
  zipPath: string,
  tempDir: string,
): { promise: Promise<void>; kill: () => void } => {
  const proc = spawn('unzip', ['-qq', '-o', zipPath, '-d', tempDir], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  let stderrTail = '';
  proc.stderr?.setEncoding('utf8');
  proc.stderr?.on('data', (chunk: string) => {
    stderrTail = (stderrTail + chunk).slice(-4096);
  });

  const promise = new Promise<void>((resolve, reject) => {
    proc.on('error', (err: NodeJS.ErrnoException) => {
      reject(
        err.code === 'ENOENT'
          ? new Error(
              'unzip binary not found (install unzip in the container image)',
            )
          : err,
      );
    });
    proc.on('close', (code) => {
      if (code === 0 || code === 1) {
        resolve();
        return;
      }
      const detail = stderrTail.trim();
      reject(
        new Error(
          `unzip exited with code ${code ?? 'null'}${detail ? `: ${detail}` : ''}`,
        ),
      );
    });
  });

  return {
    promise,
    kill: () => {
      if (proc.exitCode === null && proc.signalCode === null) {
        proc.kill('SIGKILL');
      }
    },
  };
};

const extractWithExtractZip = (
  zipPath: string,
  tempDir: string,
): { promise: Promise<void>; kill: () => void } => ({
  promise: extract(zipPath, { dir: tempDir }),
  kill: () => {
    /* extract-zip has no cancel handle; rely on outer rejection. */
  },
});

const extractZipArchive = (zipPath: string, tempDir: string) => {
  if (process.platform !== 'linux') {
    return extractWithExtractZip(zipPath, tempDir);
  }

  const cli = extractWithUnzipCli(zipPath, tempDir);
  let fallbackKill: (() => void) | undefined;
  const promise = cli.promise.catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('unzip binary not found')) {
      throw err;
    }
    log.warn('unzip CLI unavailable; falling back to extract-zip');
    const fallback = extractWithExtractZip(zipPath, tempDir);
    fallbackKill = fallback.kill;
    await fallback.promise;
  });

  return {
    promise,
    kill: () => {
      cli.kill();
      fallbackKill?.();
    },
  };
};

const hostnameFromServerHost = (host: string) => {
  const serverUrl = host.includes('://') ? host : `http://${host}`;

  return new URL(serverUrl).hostname;
};

const zipDirectory = (sourceDir: string, zipPath: string) =>
  new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        log.warn('Archive warning', err.message);
        return;
      }
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  onTimeout?: () => void,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        onTimeout?.();
        reject(new Error(message));
      }, ms);
    }),
  ]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
};

const assertBackupExtracted = async (tempDir: string) => {
  const metadataPath = join(tempDir, 'metadata.json');
  const collectionsPath = join(tempDir, 'collections');
  const legacyDumpPath = join(tempDir, 'database.dump');

  try {
    await access(legacyDumpPath, constants.F_OK);
    throw new Error(
      'Backup uses legacy database.dump format (pg_dump); restore JSONL collection backups instead',
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('legacy database.dump')
    ) {
      throw error;
    }
  }

  try {
    await access(metadataPath, constants.F_OK);
  } catch {
    // Legacy Arango JSONL templates (e.g. test-backup.zip) omit metadata.json.
    log.warn(
      `Backup has no metadata.json under ${tempDir}; treating as legacy Arango JSONL`,
    );
  }

  try {
    await access(collectionsPath, constants.F_OK);
  } catch {
    throw new Error(
      'Backup invalid: missing collections/ directory after extract',
    );
  }

  const files = await readdir(collectionsPath);
  const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
  if (jsonlFiles.length === 0) {
    throw new Error(
      'Backup invalid: collections/ contains no .jsonl files (zip may be truncated)',
    );
  }

  log.info(`Found ${jsonlFiles.length} collection backup files in archive`);
};

const restoreDatabaseFromBackup = async (
  collectionsDir: string,
  databaseType: BackupDatabaseType,
  schemaVersion?: string,
) => {
  log.info('Restoring %s database from JSONL collections', databaseType);

  const { total } =
    databaseType === 'postgres'
      ? await importAllPostgresCollections(collectionsDir, schemaVersion)
      : await importAllArangoCollections(collectionsDir);

  if (total === 0) {
    throw new Error(
      'Backup restore completed with zero rows; archive may be empty or corrupt',
    );
  }

  log.info('Restored %d database rows from backup', total);
};

export const createBackup = async () => {
  try {
    const coreConfig = await config();
    const comConfig = await communityConfig();
    const dirName = (
      comConfig.info.name +
      '-backup-' +
      new Date().toISOString() +
      '-'
    ).replace(/[^a-zA-Z0-9_-]/g, '_');

    const backupDir = await mkdtemp(join(tmpdir(), dirName));
    const metaDir = join(backupDir, 'meta');
    const collectionsDir = join(backupDir, 'collections');
    const mediaDir = join(backupDir, 'media');
    const logsDir = join(backupDir, 'logs');

    await mkdir(metaDir);
    await mkdir(collectionsDir);
    await mkdir(mediaDir);
    await cp(coreConfig.media.storage.params.path, mediaDir, {
      recursive: true,
    });
    await mkdir(logsDir);
    await cp(coreConfig.logs.local.path, logsDir, {
      recursive: true,
    });

    await writeFile(
      join(metaDir, 'collectionInfos.json'),
      JSON.stringify(collectionInfos, null, 2),
    );
    await writeFile(
      join(backupDir, 'metadata.json'),
      JSON.stringify(
        {
          databaseType: 'postgres',
          createdAt: new Date().toISOString(),
          schemaVersion: getLatestSchemaVersion(),
          config: {
            hostname: hostnameFromServerHost(coreConfig.server.host),
          },
        } satisfies BackupMetadata,
        null,
        2,
      ),
    );

    log.info('Exporting Postgres tables to JSONL collections');
    await exportAllPostgresCollections(collectionsDir);

    const backupZip = `${backupDir}.zip`;
    await zipDirectory(backupDir, backupZip);
    await rm(backupDir, { recursive: true, force: true });

    return backupDir.split(sep).pop();
  } catch (e) {
    log.error('Error creating backup', e);
    throw e;
  }
};

export const downloadBackup = async (name: string) =>
  join(tmpdir(), name + '.zip');

export const listAllBackups = async () => {
  const backups = await readdir(tmpdir());
  const comConfig = await communityConfig();

  return backups
    .filter(
      (backup) =>
        (backup.startsWith(
          (comConfig.info.name + '-backup-').replace(/[^a-zA-Z0-9_-]/g, '_'),
        ) ||
          backup.startsWith('allpeep-backup-')) &&
        backup.endsWith('.zip'),
    )
    .map((filename) => filename.replace('.zip', ''));
};

export const restoreBackups = async (zipFilePath: string) => {
  console.log('Restoring backup', zipFilePath);
  log.info(`Restoring backup ${zipFilePath}`);
  const coreConfig = await config();
  const tempDir = await mkdtemp(join(tmpdir(), 'restore-'));
  // Admin/CLI may pass a bare filename under tmpdir(); fixtures pass absolute paths.
  // Do not path.join(tmpdir(), absolutePath) — Node join keeps the tmpdir prefix.
  const zipPath = isAbsolute(zipFilePath)
    ? zipFilePath
    : join(tmpdir(), zipFilePath);
  log.info(`Unpacking backup into ${tempDir} ...`);

  const extraction = extractZipArchive(zipPath, tempDir);
  try {
    await withTimeout(
      extraction.promise,
      EXTRACT_TIMEOUT_MS,
      `Timed out unpacking backup ${zipFilePath} after ${EXTRACT_TIMEOUT_MS}ms (zip may be truncated or corrupt)`,
      extraction.kill,
    );
  } catch (error) {
    log.error(`Failed to unpack backup ${zipFilePath}`, error);
    throw error;
  }
  log.info(`Unpacking backup into ${tempDir} complete`);
  await assertBackupExtracted(tempDir);

  const collectionsDir = join(tempDir, 'collections');
  const backupMetadata: BackupMetadata | undefined = await readFile(
    join(tempDir, 'metadata.json'),
    'utf-8',
  )
    .then(JSON.parse)
    .catch(() => undefined);
  const databaseType = resolveBackupDatabaseType(backupMetadata);

  log.info(`Emptying media directory ${coreConfig.media.storage.params.path}`);
  await emptyDir(coreConfig.media.storage.params.path);
  log.info(
    `Copying media from backup to ${coreConfig.media.storage.params.path}`,
  );
  await cp(join(tempDir, 'media'), coreConfig.media.storage.params.path, {
    recursive: true,
  });

  log.info(`Emptying logs directory ${coreConfig.logs.local.path}`);
  await emptyDir(coreConfig.logs.local.path);
  log.info(`Copying logs from backup to ${coreConfig.logs.local.path}`);
  await cp(join(tempDir, 'logs'), coreConfig.logs.local.path, {
    recursive: true,
  });

  await restoreDatabaseFromBackup(
    collectionsDir,
    databaseType,
    backupMetadata?.schemaVersion,
  );

  // Repoint the backup's absolute URLs at this server's full origin (scheme +
  // host + port). Matching by the backup hostname means a prod backup on
  // `https://host` restores cleanly onto `http://localhost:5174` without
  // stranding the old scheme/port.
  await replaceOrigin(backupMetadata?.config?.hostname, await serverRootUrl());

  log.info(
    `Restored ${databaseType} backup (hostname was ${backupMetadata?.config?.hostname ?? 'unknown'})`,
  );

  await setDefaultRoles();
};
