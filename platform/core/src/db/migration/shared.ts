import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_EXPORT_DIR = './arango-export';

export const exportDirFromEnv = () =>
  process.env.MIGRATION_EXPORT_DIR ?? DEFAULT_EXPORT_DIR;

export const collectionsDir = (exportDir: string) =>
  join(exportDir, 'collections');

export const manifestPath = (exportDir: string) =>
  join(exportDir, 'manifest.json');

/** Counts actually inserted into Postgres (after skips / remaps / dedupe). */
export const importStatsPath = (exportDir: string) =>
  join(exportDir, 'import-stats.json');

export type ImportStats = {
  importedAt: string;
  collections: CollectionCounts;
};

export const collectionFilePath = (exportDir: string, collection: string) =>
  join(collectionsDir(exportDir), `${collection}.jsonl`);

export const DOCUMENT_IMPORT_ORDER = [
  'configs',
  'i18n',
  'dataMigrations',
  'accounts',
  'roles',
  'profiles',
  'groups',
  'hashtags',
  'posts',
  'notifications',
  'reports',
  'accessTokens',
  'pushSubscriptions',
  'inviteLinks',
  'jamEvents',
  'mediaAttachments',
  'processingStats',
  'profileSettings',
] as const;

export const EDGE_IMPORT_ORDER = [
  'controls',
  'follows',
  'requestsFollow',
  'mentions',
  'audience',
  'postHashtags',
  'entries',
  'reactions',
  'replyTo',
  'repost',
  'bookmarks',
  'postSeen',
  'hasSeen',
  'hasRead',
  'userGroups',
  'postGroups',
  'hasRole',
  'profileAccessTokens',
  'accountToPushSubscription',
  'createdReport',
  'isReportedProfile',
  'isReportedObject',
  'inviteLinkCreators',
  'inviteLinkRedeemers',
  'jamRecordings',
] as const;

export type CollectionCounts = Record<string, number>;

export type MigrationManifest = {
  exportedAt: string;
  dbUrl: string;
  dbName?: string;
  collections: CollectionCounts;
  checksums: {
    accountEmails: string;
    postIds: string;
  };
};

export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const sortedChecksum = (values: string[]) =>
  sha256(values.filter(Boolean).sort().join('\n'));

export const readJsonl = async (
  filePath: string,
): Promise<Record<string, unknown>[]> => {
  const docs: Record<string, unknown>[] = [];
  let buffer = '';

  const lineReader = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of lineReader) {
    if (!line.trim()) {
      continue;
    }
    buffer += line;
    try {
      docs.push(JSON.parse(buffer) as Record<string, unknown>);
      buffer = '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const partialJson =
        message.includes('Unexpected end of JSON input') ||
        message.includes('Unterminated string') ||
        message.includes('Unexpected token');
      if (!partialJson) {
        throw err;
      }
    }
  }

  if (buffer.trim().length > 0) {
    throw new Error(`Unparsed JSON remaining in ${filePath}`);
  }

  return docs;
};

export const readManifest = async (
  exportDir: string,
): Promise<MigrationManifest> => {
  const raw = await readFile(manifestPath(exportDir), 'utf-8');
  return JSON.parse(raw) as MigrationManifest;
};

export const writeManifest = async (
  exportDir: string,
  manifest: MigrationManifest,
) => {
  await writeFile(manifestPath(exportDir), JSON.stringify(manifest, null, 2));
};

export const writeImportStats = async (
  exportDir: string,
  collections: CollectionCounts,
) => {
  const stats: ImportStats = {
    importedAt: new Date().toISOString(),
    collections,
  };
  await writeFile(importStatsPath(exportDir), JSON.stringify(stats, null, 2));
};

export const readImportStats = async (
  exportDir: string,
): Promise<ImportStats | null> => {
  try {
    await access(importStatsPath(exportDir), constants.F_OK);
  } catch {
    return null;
  }
  const raw = await readFile(importStatsPath(exportDir), 'utf-8');
  return JSON.parse(raw) as ImportStats;
};

/** Prefer post-import counts when present (skips / remaps / dedupe). */
export const expectedCollectionCount = (
  collection: string,
  manifestCounts: CollectionCounts,
  importedCounts: CollectionCounts | null,
): number =>
  importedCounts
    ? (importedCounts[collection] ?? 0)
    : (manifestCounts[collection] ?? 0);

export const assertExportDir = async (exportDir: string) => {
  await access(manifestPath(exportDir), constants.F_OK);
  await access(collectionsDir(exportDir), constants.F_OK);
};

export const BATCH_SIZE = 500;
