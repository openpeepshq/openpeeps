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
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { emptyDir } from 'fs-extra';
import { createInterface } from 'node:readline';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { aql } from 'arangojs';
import archiver from 'archiver';
import extract from 'extract-zip';
import { allpeepDb, arangoDb } from '../db';
import { communityConfig, config } from '../config';
import { logger } from '../log';
import { ensureIndexedCollection } from '../db/helpers';
import { collectionInfos } from '../db';
import { runDataMigrations } from '../db/dataMigrations';
import { CollectionInfo } from '@openpeeps/arango-querybuilder';
import { setDefaultRoles } from '../roles';
import { replaceHostname } from '../db/replaceHostname';

const log = logger('core:backups');

/** Safety net if extraction stalls (normal 1 GiB restore finishes in a few minutes). */
const EXTRACT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Native `unzip` (Info-ZIP) extractor used on Linux containers. Node-based zip
 * libraries (`unarchive`, `extract-zip`) reliably wedge at ~1 GiB on linux/x64
 * with 0% CPU; the system `unzip` binary handles the same archives without issue.
 *
 * `-qq` silences per-file output so the OS pipe buffer (~64 KiB) can't fill
 * and deadlock the child on `write()` for large archives. We still drain
 * stderr and capture the tail for diagnostics if `unzip` exits non-zero.
 */
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
          ? new Error('unzip binary not found (install unzip in the container image)')
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

const assertBackupExtracted = async (tempDir: string) => {
  const metadataPath = join(tempDir, 'metadata.json');
  const collectionsPath = join(tempDir, 'collections');

  try {
    await access(metadataPath, constants.F_OK);
  } catch {
    throw new Error(
      `Backup invalid: missing metadata.json after extracting to ${tempDir}`,
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

export const createBackup = async () => {
  try {
    const db = await allpeepDb();
    const coreConfig = await config();
    const comConfig = await communityConfig();
    const collections = await db.db.listCollections();
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
          config: {
            hostname: hostnameFromServerHost(coreConfig.server.host),
          },
        },
        null,
        2,
      ),
    );

    for (const collection of collections) {
      const collectionName = collection.name;

      const collectionData = db.db.collection(collectionName);

      const collectionFileName = join(
        collectionsDir,
        `${collectionName}.jsonl`,
      );

      const allCollectionCursor = await db.db.query(
        aql`
        FOR doc IN ${collectionData}
        RETURN doc
      `,
      );

      for await (const doc of allCollectionCursor) {
        await appendFile(collectionFileName, JSON.stringify(doc) + '\n');
      }
    }

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
  const database = await arangoDb();
  log.info(`Database connected`);
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
  const collectionsDir = join(tempDir, 'collections');
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

  const restoreCollectionInfos: Record<string, CollectionInfo> = await readFile(
    join(tempDir, 'meta', 'collectionInfos.json'),
    'utf-8',
  )
    .then(JSON.parse)
    .catch(() => collectionInfos);

  log.info(`Restoring collections`);
  let totalDocuments = 0;
  for (const collectionInfo of Object.values(restoreCollectionInfos)) {
    const collectionName = collectionInfo.name;
    const jsonlPath = join(collectionsDir, `${collectionName}.jsonl`);

    try {
      await access(jsonlPath, constants.F_OK);
    } catch {
      log.info(`Skipping collection ${collectionName} (no backup file)`);
      continue;
    }

    log.info(`Restoring collection ${collectionName}`);
    const oldCollection = database.collection(collectionName);
    if (await oldCollection.exists()) {
      log.info(`Dropping collection ${collectionName}`);
      await oldCollection.drop();
    }

    const collectionObject = await ensureIndexedCollection(
      database,
      collectionInfo,
    );
    let buffer = '';
    let documentCount = 0;

    const lineReader = createInterface({
      input: createReadStream(jsonlPath),
      crlfDelay: Infinity,
    });

    for await (const line of lineReader) {
      buffer += line;
      try {
        const json = JSON.parse(buffer);

        buffer = '';

        await collectionObject.save(json, { returnNew: true });
        documentCount++;
      } catch (err: any) {
        const isInvalidJSON: boolean =
          err.message.includes('Unexpected end of JSON input') ||
          err.message.includes('Unterminated string') ||
          err.message.includes('Unexpected token');
        if (!isInvalidJSON) {
          log.error(
            `JSON parse error in ${collectionName}:`,
            err.message,
          );
          buffer = '';
          throw err;
        }
      }
    }

    if (buffer.trim().length > 0) {
      throw new Error(
        `Unparsed JSON remaining in ${collectionName}: ${buffer.slice(0, 200)}`,
      );
    }

    totalDocuments += documentCount;
    log.info(
      `Successfully restored collection ${collectionName} (${documentCount} documents)`,
    );
  }

  log.info(`Restored ${totalDocuments} documents across all collections`);
  if (totalDocuments === 0) {
    throw new Error(
      'Backup restore completed with zero documents; archive may be empty or corrupt',
    );
  }

  const newCollectionNames = Object.values(restoreCollectionInfos).map(
    (ci) => ci.name,
  );
  for (const oldCollection of await database.listCollections()) {
    if (!newCollectionNames.includes(oldCollection.name)) {
      await database.collection(oldCollection.name).drop();
      log.info(`Dropped collection ${oldCollection.name}`);
    }
  }

  await runDataMigrations(database);
  await replaceHostname(
    database,
    backupMetadata?.config?.hostname,
    hostnameFromServerHost(coreConfig.server.host),
  );

  await setDefaultRoles();
};
