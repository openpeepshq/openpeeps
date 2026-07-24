import { randomUUID } from 'node:crypto';
import { appendFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { getTableName, sql, type Table } from 'drizzle-orm';
import { logger } from '../../log';
import { pgDb } from '../pg/client';
import { runMigrations } from '../pg/migrate';
import {
  documentRegistry,
  edgeRegistry,
  getTableForCollection,
} from '../pg/map/registry';
import {
  arangoDocToDocumentRow,
  arangoDocToEdgeRow,
  buildPostCreatorIdByPostId,
  type ImportContext,
  isEdgeCollection,
  normalizeImportId,
} from './transform';
import {
  BATCH_SIZE,
  DOCUMENT_IMPORT_ORDER,
  EDGE_IMPORT_ORDER,
  readJsonl,
} from './shared';

const log = logger('core:db:import');

const rowDedupeKey = (row: Record<string, unknown>): string | undefined =>
  normalizeImportId(row.id ?? row.key);

/** Arango exports can contain duplicate _key lines; keep the last row per id. */
export const dedupeRowsById = <T extends Record<string, unknown>>(
  rows: T[],
): T[] => {
  const byKey = new Map<string, T>();
  const withoutKey: T[] = [];

  for (const row of rows) {
    const key = rowDedupeKey(row);
    if (key) {
      byKey.set(key, typeof row.id === 'string' ? { ...row, id: key } : row);
    } else {
      withoutKey.push(row);
    }
  }

  return [...byKey.values(), ...withoutKey];
};

export const collectionJsonlPath = (
  collectionsDir: string,
  collection: string,
) => join(collectionsDir, `${collection}.jsonl`);

const isKnownCollection = (collection: string) =>
  collection in documentRegistry || collection in edgeRegistry;

export const truncateAllTables = async () => {
  const db = pgDb();
  const tableNames = [
    ...EDGE_IMPORT_ORDER.map((collection) =>
      getTableName(edgeRegistry[collection].table as Table),
    ),
    ...[...DOCUMENT_IMPORT_ORDER]
      .reverse()
      .map((collection) =>
        getTableName(documentRegistry[collection].table as Table),
      ),
  ];

  const existing: string[] = [];
  for (const name of tableNames) {
    const result = await db.execute<{ regclass: string | null }>(
      sql.raw(`SELECT to_regclass('public.${name}')::text AS regclass`),
    );
    if (result.rows[0]?.regclass != null) {
      existing.push(name);
    }
  }

  if (existing.length === 0) {
    return;
  }

  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${existing.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/**
 * Edge `id` columns are uuid. Legacy Arango edge `_key`s are sometimes numeric
 * (or otherwise non-UUID); replace those so the insert does not fail. Document
 * collections are left alone (`data_migrations.id` is text, not uuid).
 */
const ensureEdgeUuidId = (
  collection: string,
  row: Record<string, unknown>,
): Record<string, unknown> => {
  if (!isEdgeCollection(collection)) {
    return row;
  }
  if (isUuid(row.id)) {
    const normalized = normalizeImportId(row.id) ?? String(row.id);
    return normalized === row.id ? row : { ...row, id: normalized };
  }
  const next = { ...row, id: randomUUID() };
  log.warn(
    'Replaced non-UUID %s edge id %s with %s',
    collection,
    String(row.id),
    next.id,
  );
  return next;
};

const documentRowIsImportable = (
  collection: string,
  row: Record<string, unknown>,
) => {
  if (collection === 'posts' && !row.creatorId) {
    log.warn('Skipping post %s: missing creatorId', row.id);
    return false;
  }
  if (collection === 'jamEvents' && !row.postId) {
    log.warn('Skipping jam event %s: missing postId', row.id);
    return false;
  }
  if (collection === 'profileSettings' && !row.profileId) {
    log.warn('Skipping profile settings %s: missing profileId', row.id);
    return false;
  }
  return true;
};

/** Collapse empty / duplicate hashtag names onto one row (unique on name). */
export const prepareHashtagRows = (
  rows: Record<string, unknown>[],
  context: ImportContext,
): Record<string, unknown>[] => {
  const remap = context.hashtagIdRemap ?? new Map<string, string>();
  context.hashtagIdRemap = remap;
  const byName = new Map<string, Record<string, unknown>>();
  const prepared: Record<string, unknown>[] = [];

  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : undefined;
    const name =
      typeof row.name === 'string' ? row.name.trim().toLowerCase() : '';
    if (!name) {
      if (id) remap.set(id, '');
      log.warn('Skipping hashtag %s: empty name', id ?? '(no id)');
      continue;
    }
    row.name = name;
    const existing = byName.get(name);
    if (existing) {
      const keptId = typeof existing.id === 'string' ? existing.id : '';
      if (id) remap.set(id, keptId);
      log.warn(
        'Skipping duplicate hashtag name "%s" (id %s → %s)',
        name,
        id,
        keptId || '(unknown)',
      );
      continue;
    }
    byName.set(name, row);
    prepared.push(row);
  }

  return prepared;
};

const applyHashtagEdgeRemap = (
  collection: string,
  rows: Record<string, unknown>[],
  context: ImportContext,
): Record<string, unknown>[] => {
  if (collection !== 'postHashtags' || !context.hashtagIdRemap?.size) {
    return rows;
  }
  const remap = context.hashtagIdRemap;
  const out: Record<string, unknown>[] = [];
  let dropped = 0;
  for (const row of rows) {
    const toId = typeof row.toId === 'string' ? row.toId : undefined;
    if (!toId || !remap.has(toId)) {
      out.push(row);
      continue;
    }
    const mapped = remap.get(toId);
    if (!mapped) {
      dropped += 1;
      continue;
    }
    out.push({ ...row, toId: mapped });
  }
  if (dropped > 0) {
    log.warn(
      'Dropped %d postHashtags edge(s) pointing at skipped hashtags',
      dropped,
    );
  }
  return out;
};

export const importArangoCollection = async (
  collection: string,
  collectionsDir: string,
  context: ImportContext = {},
): Promise<number> => {
  if (!isKnownCollection(collection)) {
    return 0;
  }

  const filePath = collectionJsonlPath(collectionsDir, collection);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return 0;
  }

  const docs = await readJsonl(filePath);
  if (docs.length === 0) {
    return 0;
  }

  const table = getTableForCollection(collection);
  const db = pgDb();
  let mapped = docs.map((doc) =>
    isEdgeCollection(collection)
      ? arangoDocToEdgeRow(collection, doc)
      : arangoDocToDocumentRow(collection, doc, context),
  );

  if (collection === 'hashtags') {
    mapped = prepareHashtagRows(mapped, context);
  } else {
    mapped = mapped.filter((row) => documentRowIsImportable(collection, row));
  }

  mapped = applyHashtagEdgeRemap(collection, mapped, context);
  mapped = mapped.map((row) => ensureEdgeUuidId(collection, row));

  const beforeDedupe = mapped.length;
  const rows = dedupeRowsById(mapped);

  if (rows.length < beforeDedupe) {
    log.warn(
      'Dropped %d duplicate row(s) while importing %s (e.g. remapped config keys or duplicate _key)',
      beforeDedupe - rows.length,
      collection,
    );
  }

  if (rows.length === 0) {
    return 0;
  }

  let imported = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    try {
      await db.insert(table as never).values(batch as never);
    } catch (err) {
      const cause =
        err && typeof err === 'object' && 'cause' in err
          ? (err as { cause: unknown }).cause
          : undefined;
      const detail =
        cause instanceof Error
          ? cause.message
          : err instanceof Error
            ? err.message
            : String(err);
      throw new Error(
        `Failed importing ${collection} batch at offset ${offset} (${batch.length} rows): ${detail}`,
      );
    }
    imported += batch.length;
  }

  log.info('Imported %d rows into %s from Arango JSONL', imported, collection);
  return imported;
};

export const importPostgresRowCollection = async (
  collection: string,
  collectionsDir: string,
): Promise<number> => {
  if (!isKnownCollection(collection)) {
    return 0;
  }

  const filePath = collectionJsonlPath(collectionsDir, collection);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return 0;
  }

  const mapped = await readJsonl(filePath);
  if (mapped.length === 0) {
    return 0;
  }

  const withValidIds = mapped.map((row) => ensureEdgeUuidId(collection, row));
  const rows = dedupeRowsById(withValidIds);
  if (rows.length < mapped.length) {
    log.warn(
      'Dropped %d duplicate row(s) while importing %s',
      mapped.length - rows.length,
      collection,
    );
  }

  const table = getTableForCollection(collection);
  const db = pgDb();
  let imported = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await db.insert(table as never).values(batch as never);
    imported += batch.length;
  }

  log.info(
    'Imported %d rows into %s from Postgres JSONL',
    imported,
    collection,
  );
  return imported;
};

const sumImported = (imported: Record<string, number>) =>
  Object.values(imported).reduce((sum, count) => sum + count, 0);

export const importAllArangoCollections = async (collectionsDir: string) => {
  await runMigrations();
  await truncateAllTables();

  const imported: Record<string, number> = {};
  const context: ImportContext = {
    postCreatorIdByPostId: await buildPostCreatorIdByPostId(collectionsDir),
    hashtagIdRemap: new Map(),
  };

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    imported[collection] = await importArangoCollection(
      collection,
      collectionsDir,
      context,
    );
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    imported[collection] = await importArangoCollection(
      collection,
      collectionsDir,
      context,
    );
  }

  const total = sumImported(imported);
  log.info(
    'Arango JSONL import complete: %d rows across %d collections',
    total,
    Object.keys(imported).filter((key) => imported[key] > 0).length,
  );

  return { imported, total };
};

export const importAllPostgresCollections = async (collectionsDir: string) => {
  await runMigrations();
  await truncateAllTables();

  const imported: Record<string, number> = {};

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    imported[collection] = await importPostgresRowCollection(
      collection,
      collectionsDir,
    );
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    imported[collection] = await importPostgresRowCollection(
      collection,
      collectionsDir,
    );
  }

  const total = sumImported(imported);
  log.info(
    'Postgres JSONL import complete: %d rows across %d collections',
    total,
    Object.keys(imported).filter((key) => imported[key] > 0).length,
  );

  return { imported, total };
};

export const exportAllPostgresCollections = async (collectionsDir: string) => {
  const db = pgDb();
  const collections = [...DOCUMENT_IMPORT_ORDER, ...EDGE_IMPORT_ORDER];

  for (const collection of collections) {
    const table = getTableForCollection(collection);
    const rows = await db.select().from(table as never);

    if (rows.length === 0) {
      continue;
    }

    const filePath = collectionJsonlPath(collectionsDir, collection);
    for (const row of rows) {
      await appendFile(filePath, `${JSON.stringify(row)}\n`);
    }

    log.info('Exported %d rows from %s', rows.length, collection);
  }
};
