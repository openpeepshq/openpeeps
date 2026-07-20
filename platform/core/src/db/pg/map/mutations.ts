import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { MapData } from './queryTypes';
import type { PgDb } from '../client';
import { nowIso } from '../mappers';
import { asTable, documentRegistry, getTableForCollection } from './registry';
import { executeFind } from './relations';

export const createDocument = async <O extends { id: string }>(
  db: PgDb,
  mapData: MapData<O, O>,
  data: Record<string, unknown> & { id?: string },
): Promise<O> => {
  const collection = mapData.collection;
  const config = documentRegistry[collection];
  if (!config) {
    throw new Error(`Cannot create in collection: ${collection}`);
  }

  const id = data.id ?? uuidv7();
  const { scalars, body } = config.splitPatch(data);
  const ts = nowIso();

  await db.insert(config.table as never).values({
    id,
    ...scalars,
    body,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  } as never);

  const created = await executeFind(db, collection, mapData, id, true);
  if (!created) {
    throw new Error(`create ${collection}`);
  }
  return created as O;
};

export const updateDocument = async <O extends { id: string }>(
  db: PgDb,
  mapData: MapData<O, O>,
  id: string,
  patch: Record<string, unknown>,
): Promise<O> => {
  const collection = mapData.collection;
  const config = documentRegistry[collection];
  if (!config) {
    throw new Error(`Cannot update collection: ${collection}`);
  }

  const table = asTable(config.table);
  const existing = await db
    .select()
    .from(config.table as never)
    .where(eq(table.id as never, id))
    .limit(1);
  const row = existing[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error(`update ${collection} ${id}`);
  }

  const merged = {
    ...rowToPatchInput(collection, row),
    ...patch,
  };
  const { scalars, body } = config.splitPatch(merged);

  await db
    .update(table as never)
    .set({
      ...scalars,
      body,
      updatedAt: nowIso(),
    } as never)
    .where(eq(table.id as never, id));

  const updated = await executeFind(db, collection, mapData, id, true);
  if (!updated) {
    throw new Error(`update ${collection} ${id}`);
  }
  return updated as O;
};

const rowToPatchInput = (
  collection: string,
  row: Record<string, unknown>,
): Record<string, unknown> => {
  switch (collection) {
    case 'posts':
      return {
        type: row.type,
        visibility: row.visibility,
        creatorId: row.creatorId,
        data: row.body,
      };
    case 'profiles':
      return {
        handle: row.handle,
        type: row.type,
        ...(row.activityPubDomain
          ? { activityPub: { domain: row.activityPubDomain } }
          : {}),
        ...(row.body as object),
      };
    case 'groups':
      return { handle: row.handle, ...(row.body as object) };
    case 'roles':
      return {
        key: row.key,
        isDefault: row.isDefault,
        ...(row.body as object),
      };
    case 'notifications':
      return { profileId: row.profileId, ...(row.body as object) };
    case 'jamEvents':
      return { jamId: row.postId, ...(row.body as object) };
    case 'processingStats':
      return {
        filetype: row.filetype,
        filesize: row.filesize,
        ...(row.body as object),
      };
    case 'profileSettings':
      return { id: row.profileId, ...(row.body as object) };
    case 'inviteLinks':
      return { slug: row.slug, ...(row.body as object) };
    case 'accounts':
      return {
        email: row.email,
        passwordHash: row.passwordHash,
        emailValidated: row.emailValidated,
        guest: row.guest,
      };
    case 'hashtags':
      return { tag: row.name };
    default:
      return { ...(row.body as object) };
  }
};

export const deleteDocument = async (
  db: PgDb,
  mapData: MapData<object, object>,
  id: string,
): Promise<void> => {
  const table = asTable(getTableForCollection(mapData.collection));
  if (mapData.softDelete !== false && table.deletedAt) {
    await db
      .update(getTableForCollection(mapData.collection) as never)
      .set({ deletedAt: nowIso(), updatedAt: nowIso() } as never)
      .where(eq(table.id as never, id));
    return;
  }
  await db
    .delete(getTableForCollection(mapData.collection) as never)
    .where(eq(table.id as never, id));
};
