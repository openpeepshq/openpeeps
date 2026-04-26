import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  writeFile,
  readFile,
} from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { emptyDir } from 'fs-extra';
import { createInterface } from 'node:readline';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { aql } from 'arangojs';
import archiver from 'archiver';
import { unarchive } from 'unarchive';
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

type BackupMetadata = {
  config?: {
    hostname?: string;
  };
};

const hostnameFromServerHost = (host: string) => {
  const serverUrl = host.includes('://') ? host : `http://${host}`;

  return new URL(serverUrl).hostname;
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
    console.log('backupDir', backupDir);
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
    const output = createWriteStream(backupZip);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(output);
    archive.directory(backupDir, false);

    await archive.finalize();

    return backupDir.split(sep).pop();
  } catch (e) {
    log.error('Error creating backup', e);
    return '';
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
  log.info(`Unpacking backup into ${tempDir} ...`);
  await unarchive(join(tmpdir(), zipFilePath), tempDir);
  log.info(`Unpacking backup into ${tempDir} complete`);
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
  for (const collectionInfo of Object.values(restoreCollectionInfos)) {
    const collectionName = collectionInfo.name;
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

    try {
      const lineReader = createInterface({
        input: createReadStream(
          join(collectionsDir, `${collectionName}.jsonl`),
        ),
        crlfDelay: Infinity,
      });

      for await (const line of lineReader) {
        buffer += line;
        try {
          const json = JSON.parse(buffer);

          buffer = '';

          await collectionObject.save(json, { returnNew: true });
        } catch (err: any) {
          const isInvalidJSON: boolean =
            err.message.includes('Unexpected end of JSON input') ||
            err.message.includes('Unterminated string') ||
            err.message.includes('Unexpected token');
          if (!isInvalidJSON) {
            console.error(
              `JSON parse error in ${collectionName}:`,
              err.message,
            );
            buffer = '';
          }
        }
      }

      if (buffer.trim().length > 0) {
        console.warn(
          `Unparsed buffer remaining in ${collectionName}:`,
          buffer.slice(0, 200),
        );
      }
      log.info(`Successfully restored collection ${collectionName}`);
    } catch (error) {
      log.error('Error restoring collection', collectionName, error);
    }
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
