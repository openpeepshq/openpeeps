import type { FilterAndTransformOptions, ObjectFilter } from './types';
import type { CollectionInfo } from './pg/map/queryTypes';
import type { Limit, Mapping, ObjectSort, WithId } from './pg/map';
import type { PgQueryResult } from './pg/map/types';
import type { PgDb } from './pg/client';
import { deleteEdge as deletePgEdge, insertEdge } from './pg/helpers';
import { asTable, edgeRegistry } from './pg/map/registry';
import { nowIso } from './pg/mappers';
import { and, eq } from 'drizzle-orm';
import { documentKeyAfter, documentKeyBefore } from './pg/filters';
import { sorts } from './pg/queries';

const getPgEdge = async <C extends Record<string, unknown>>(
  db: PgDb,
  edgeCollectionName: string,
  fromId: string,
  toId: string,
): Promise<(C & { id: string; _from: string; _to: string }) | undefined> => {
  const edgeConfig = edgeRegistry[edgeCollectionName];
  if (!edgeConfig) {
    throw new Error(`Unknown edge collection: ${edgeCollectionName}`);
  }
  const table = asTable(edgeConfig.table);
  const rows = await db
    .select()
    .from(edgeConfig.table as never)
    .where(
      and(eq(table.fromId as never, fromId), eq(table.toId as never, toId)),
    )
    .limit(1);
  const row = rows[0] as
    | {
        id: string;
        fromId: string;
        toId: string;
        body?: Record<string, unknown>;
      }
    | undefined;
  if (!row) return undefined;
  return {
    ...(row.body as C),
    id: row.id,
    _from: `${edgeConfig.fromCollection}/${row.fromId}`,
    _to: `${edgeConfig.toCollection}/${row.toId}`,
  };
};

export const connector =
  <
    F extends { id: string },
    T extends { id: string },
    E extends object = object,
  >(
    fromCollectionInfo: CollectionInfo,
    toCollectionInfo: CollectionInfo,
    edgeCollectionInfo: CollectionInfo,
  ) =>
  async (
    db: PgDb,
    from: F,
    to: T,
    data: E & { id?: string } = {} as E & { id?: string },
  ) => {
    const edgeConfig = edgeRegistry[edgeCollectionInfo.name];
    if (!edgeConfig) {
      throw new Error(`Unknown edge collection: ${edgeCollectionInfo.name}`);
    }
    const id = await insertEdge(
      db,
      edgeConfig.table as never,
      from.id,
      to.id,
      data as Record<string, unknown>,
    );
    return {
      ...(data as E),
      id,
      _from: `${fromCollectionInfo.name}/${from.id}`,
      _to: `${toCollectionInfo.name}/${to.id}`,
    } as WithId<E & { _from: string; _to: string }>;
  };

export const disconnector =
  <F extends { id: string }, T extends { id: string }>(
    _fromCollectionInfo: CollectionInfo,
    _toCollectionInfo: CollectionInfo,
    edgeCollectionInfo: CollectionInfo,
  ) =>
  async (db: PgDb, from: F, to: T) => {
    const edgeConfig = edgeRegistry[edgeCollectionInfo.name];
    if (!edgeConfig) {
      throw new Error(`Unknown edge collection: ${edgeCollectionInfo.name}`);
    }
    await deletePgEdge(db, edgeConfig.table as never, from.id, to.id);
  };

export const connectionUpdater =
  <
    F extends { id: string },
    T extends { id: string },
    C extends Record<string, unknown> | undefined = Record<string, unknown>,
  >(
    _fromCollectionInfo: CollectionInfo,
    _toCollectionInfo: CollectionInfo,
    edgeCollectionInfo: CollectionInfo,
  ) =>
  async (db: PgDb, from: F, to: T, data?: C) => {
    const edgeConfig = edgeRegistry[edgeCollectionInfo.name];
    if (!edgeConfig) {
      throw new Error(`Unknown edge collection: ${edgeCollectionInfo.name}`);
    }
    const table = asTable(edgeConfig.table);
    await db
      .update(edgeConfig.table as never)
      .set({
        body: data ?? {},
        updatedAt: nowIso(),
      } as never)
      .where(
        and(eq(table.fromId as never, from.id), eq(table.toId as never, to.id)),
      );
  };

export const connectionFinder =
  <
    F extends { id: string },
    T extends { id: string },
    C extends Record<string, unknown> = Record<string, unknown>,
  >(
    _fromCollectionInfo: CollectionInfo,
    _toCollectionInfo: CollectionInfo,
    edgeCollectionInfo: CollectionInfo,
  ) =>
  async (db: PgDb, from: F, to: T): Promise<C | undefined> =>
    getPgEdge<C>(db, edgeCollectionInfo.name, from.id, to.id);

export const filterBefore = <T extends object>(
  mapping: Mapping<T>,
  id?: string,
) =>
  id
    ? mapping.filter(documentKeyBefore(mapping.data().collection, id))
    : mapping;
export const filterAfter = <T extends object>(
  mapping: Mapping<T>,
  id?: string,
) =>
  id
    ? mapping.filter(documentKeyAfter(mapping.data().collection, id))
    : mapping;

export const addQuerySort = <T extends object>(
  mapping: Mapping<T>,
  sort?: ObjectSort,
) => (sort?.length ? mapping.sort(sort) : mapping);
export const sortNewestFirst = <T extends object>(mapping: Mapping<T>) =>
  mapping.sort(sorts.idDesc);
export const sortOldestFirst = <T extends object>(mapping: Mapping<T>) =>
  mapping.sort(sorts.idAsc);

export const addStartLimit = <T extends object>(
  mapping: Mapping<T>,
  start?: string,
  limit: number = 100,
): Mapping<T> => filterBefore(sortNewestFirst(mapping.limit(limit)), start);

export const addStart = <T extends object>(
  mapping: Mapping<T>,
  start?: string,
): Mapping<T> => filterBefore(sortNewestFirst(mapping), start);

const buildLimit = (limit: number, offset: number): Limit =>
  limit && offset ? [offset, limit] : limit;

/**
 * Ceiling on base rows read for one page, as a multiple of the page size. A
 * post-filter that rejects everything would otherwise walk (and hydrate) the
 * whole collection before returning an empty page.
 */
const MAX_SCAN_FACTOR = 10;

export const filterAndTransform = async <
  I extends object,
  O extends object = I,
>(
  queryResult: PgQueryResult<I>,
  db: PgDb,
  options: FilterAndTransformOptions<I, O>,
) => {
  const {
    filter = () => true,
    transform = async (i: I) => i as unknown as O,
    limit = 100,
    offset = 0,
  } = options;
  const result: O[] = [];
  const maxScan = limit * MAX_SCAN_FACTOR;
  let scanned = 0;
  let pageOffset = 0;
  while (result.length < limit && scanned < maxScan) {
    const shortfall = limit - result.length;
    // Transform is the expensive part, so read only what the page still needs
    // until a page proves the filter is dropping rows; then over-fetch to
    // converge without a round trip per remaining row.
    const nextPageLength = Math.min(
      pageOffset === 0 ? shortfall : shortfall * 2,
      maxScan - scanned,
    );
    const list = await queryResult
      .limit(buildLimit(nextPageLength, offset + pageOffset))
      .all(db);
    const filteredList = await Promise.all(list.map(transform)).then((items) =>
      items.filter(filter),
    );
    result.push(...filteredList.slice(0, shortfall));
    scanned += list.length;
    if (list.length < nextPageLength) {
      break;
    }
    pageOffset += nextPageLength;
  }
  return result;
};

export const composeFilters =
  <O extends object>(...filters: ObjectFilter<O>[]): ObjectFilter<O> =>
  (item: O) =>
    filters.every((filter) => filter(item));

export const retrievePaged = async <T extends object>(
  queryResult: PgQueryResult<T>,
  db: PgDb,
  options: { limit: number } = { limit: 100 },
) => {
  const { limit } = options;
  const result: T[] = [];
  let pageOffset = 0;
  while (true) {
    const list = await queryResult.limit(buildLimit(limit, pageOffset)).all(db);
    result.push(...list);
    if (list.length < limit) {
      break;
    }
    pageOffset += limit;
  }
  return result;
};
