import {
  appendFile,
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  writeFile,
  readFile,
} from 'node:fs/promises';
import { constants, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { emptyDir } from 'fs-extra';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import archiver from 'archiver';
import extract from 'extract-zip';
import { allpeepDb } from '../db';
import { pgConnectionString } from '../db/pg/client';
import { communityConfig, config } from '../config';
import { logger } from '../log';
import { setDefaultRoles } from '../roles';

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

const extractZipArchive = (zipPath: string, tempDir: string) =>
  process.platform === 'linux'
    ? extractWithUnzipCli(zipPath, tempDir)
    : extractWithExtractZip(zipPath, tempDir);

type BackupMetadata = {
  config?: {
    hostname?: string;
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

const runCommand = (command: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderrTail = '';
    proc.stderr?.setEncoding('utf8');
    proc.stderr?.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-4096);
    });
    proc.on('error', (err: NodeJS.ErrnoException) => {
      reject(
        err.code === 'ENOENT' ? new Error(`${command} binary not found`) : err,
      );
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderrTail.trim();
      reject(
        new Error(
          `${command} exited with code ${code ?? 'null'}${detail ? `: ${detail}` : ''}`,
        ),
      );
    });
  });

const assertBackupExtracted = async (tempDir: string) => {
  const metadataPath = join(tempDir, 'metadata.json');
  const databasePath = join(tempDir, 'database.dump');

  try {
    await access(metadataPath, constants.F_OK);
  } catch {
    throw new Error(
      `Backup invalid: missing metadata.json after extracting to ${tempDir}`,
    );
  }

  try {
    await access(databasePath, constants.F_OK);
  } catch {
    throw new Error('Backup invalid: missing database.dump after extract');
  }
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
    const mediaDir = join(backupDir, 'media');
    const logsDir = join(backupDir, 'logs');
    const databaseDumpPath = join(backupDir, 'database.dump');

    await mkdir(mediaDir);
    await cp(coreConfig.media.storage.params.path, mediaDir, {
      recursive: true,
    });
    await mkdir(logsDir);
    await cp(coreConfig.logs.local.path, logsDir, {
      recursive: true,
    });

    await writeFile(
      join(backupDir, 'metadata.json'),
      JSON.stringify(
        {
          config: {
            hostname: hostnameFromServerHost(coreConfig.server.host),
          },
        },
        null,
        2,
      ),
    );

    await runCommand('pg_dump', [
      '--format=custom',
      '--file',
      databaseDumpPath,
      pgConnectionString(),
    ]);

    const backupZip = `${backupDir}.zip`;
    await zipDirectory(backupDir, backupZip);

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
  const zipPath = join(tmpdir(), zipFilePath);
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

  const backupMetadata: BackupMetadata | undefined = await readFile(
    join(tempDir, 'metadata.json'),
    'utf-8',
  )
    .then(JSON.parse)
    .catch(() => undefined);

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

  log.info('Restoring Postgres database');
  await runCommand('pg_restore', [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--dbname',
    pgConnectionString(),
    join(tempDir, 'database.dump'),
  ]);

  log.info(
    `Restored backup (hostname was ${backupMetadata?.config?.hostname ?? 'unknown'})`,
  );

  await setDefaultRoles();
};
