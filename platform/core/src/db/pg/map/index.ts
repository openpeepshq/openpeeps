import type {
  DerivedProperty,
  Limit,
  MapData,
  ObjectSort,
  OMFilter,
  Relation,
  RelationWithMapping,
  SearchDefinition,
  WithId,
} from './queryTypes';
import type { PgDb } from '../client';
import { addFilter } from './helpers';
import { createDocument, deleteDocument, updateDocument } from './mutations';
import {
  deleteRelationsFor,
  executeAll,
  executeCount,
  executeFind,
  executeFirst,
  relationsFrom,
} from './relations';
import { buildSearchResult } from './search';
import type { PgQueryResult } from './types';

export type { PgQueryResult } from './types';
export type {
  DerivedProperty,
  ForeignKeyRelation,
  Limit,
  MapData,
  ObjectSort,
  OMFilter,
  OMFilterList,
  Relation,
  RelationWithMapping,
  SearchDefinition,
  WithId,
} from './queryTypes';

export type Mapping<
  T extends object,
  O extends { id: string } = WithId<T>,
  F extends object = O,
> = {
  addRelation: (relation: Relation) => Mapping<T, O, F>;
  addRelations: (relations: Relation[]) => Mapping<T, O, F>;
  removeRelation: (
    predicate: (relation: Relation) => boolean,
  ) => Mapping<T, O, F>;
  addDerivedProperty: (derivedProperty: DerivedProperty) => Mapping<T, O, F>;
  removeDefaultFilter: () => Mapping<T, O, F>;
  filter: (filter?: OMFilter<F>) => Mapping<T, O, F>;
  clearFilters: () => Mapping<T, O, F>;
  sort: (sort?: ObjectSort) => Mapping<T, O, F>;
  limit: (limit?: Limit) => Mapping<T, O, F>;
  ignoreSoftDelete: () => Mapping<T, O, F>;
  find: (
    db: PgDb,
    id: string,
    options?: { ignoreSoftDelete?: boolean },
  ) => Promise<O | undefined>;
  findOneBy: (db: PgDb, filter: OMFilter<F>) => Promise<O | undefined>;
  all: (db: PgDb) => Promise<O[]>;
  fulltextSearch: (
    searchDefinition: SearchDefinition,
  ) => PgQueryResult<{ data: O; score: number }>;
  count: (db: PgDb) => Promise<number>;
  first: (db: PgDb) => Promise<O | undefined>;
  cursor: (db: PgDb) => AsyncGenerator<O>;
  queryBuilder: () => never;
  query: () => never;
  data: () => MapData<O, F>;
  relationsFrom: <R extends object, E extends object = R>(
    start: { id: string },
    relation: RelationWithMapping<R, E>,
  ) => PgQueryResult<E>;
  create: (db: PgDb, data: T & { id?: string }) => Promise<O>;
  update: (db: PgDb, id: string, data: Partial<T>) => Promise<O>;
  delete: (db: PgDb, id: string) => Promise<void>;
  deleteRelations: (
    db: PgDb,
    id: string,
    relation: RelationWithMapping,
  ) => Promise<void>;
};

const throwIfUndefined =
  (message: string) =>
  <V>(value: V | undefined): V => {
    if (value === undefined) {
      throw new Error(`Value is undefined: ${message}`);
    }
    return value;
  };

export const map = <
  T extends object,
  O extends { id: string } = WithId<T>,
  F extends object = O,
>(
  mapData: MapData<O, F>,
): Mapping<T, O, F> => ({
  addRelation: (relation: Relation) =>
    map({
      ...mapData,
      relations: [...(mapData.relations ?? []), relation],
    }),

  addRelations: (relations: Relation[]) =>
    map({
      ...mapData,
      relations: [...(mapData.relations ?? []), ...relations],
    }),

  removeRelation: (predicate: (relation: Relation) => boolean) =>
    map({
      ...mapData,
      relations: mapData.relations?.filter(predicate),
    }),

  addDerivedProperty: (derivedProperty: DerivedProperty) =>
    map({
      ...mapData,
      derivedProperties: [
        ...(mapData.derivedProperties ?? []),
        derivedProperty,
      ],
    }),

  removeDefaultFilter: () =>
    map({
      ...mapData,
      defaultFilter: undefined,
    }),

  filter: (filter?: OMFilter<F>) => map(addFilter(mapData, filter)),

  clearFilters: () =>
    map({
      ...mapData,
      filters: [],
    }),

  sort: (sort?: ObjectSort) =>
    sort ? map({ ...mapData, sort }) : map(mapData),

  limit: (limit?: Limit) => (limit ? map({ ...mapData, limit }) : map(mapData)),

  ignoreSoftDelete: () =>
    map({
      ...mapData,
      softDelete: false,
    }),

  find: (db: PgDb, id: string, options?: { ignoreSoftDelete?: boolean }) =>
    executeFind(
      db,
      mapData.collection,
      mapData as MapData<object, object>,
      id,
      options?.ignoreSoftDelete,
    ) as Promise<O | undefined>,

  findOneBy: (db: PgDb, filter: OMFilter<F>) =>
    map(addFilter(mapData, filter)).first(db),

  all: (db: PgDb) =>
    executeAll(db, mapData as MapData<object, object>) as Promise<O[]>,

  fulltextSearch: (searchDefinition: SearchDefinition) =>
    buildSearchResult(mapData as MapData<O>, searchDefinition),

  count: (db: PgDb) => executeCount(db, mapData as MapData<object, object>),

  first: (db: PgDb) =>
    executeFirst(db, mapData as MapData<object, object>) as Promise<
      O | undefined
    >,

  cursor: async function* (db: PgDb) {
    for (const row of await executeAll(
      db,
      mapData as MapData<object, object>,
    )) {
      yield row as O;
    }
  },

  queryBuilder: () => {
    throw new Error('queryBuilder() is not supported for Postgres map()');
  },

  query: () => {
    throw new Error('query() is not supported for Postgres map()');
  },

  data: () => mapData,

  relationsFrom: <R extends object, E extends object = R>(
    start: { id: string },
    relation: RelationWithMapping<R, E>,
  ) => {
    const result = {
      all: (db: PgDb) =>
        relationsFrom(db, start, mapData.collection, relation) as Promise<E[]>,
      count: (db: PgDb) =>
        relationsFrom(db, start, mapData.collection, relation).then(
          (rows) => rows.length,
        ),
      first: (db: PgDb) =>
        relationsFrom(db, start, mapData.collection, relation).then(
          (rows) => rows[0] as E | undefined,
        ),
      limit: (limit: Limit) => {
        const limited = map({ ...mapData, limit });
        return limited.relationsFrom(start, relation);
      },
      query: () => {
        throw new Error('query() is not supported for Postgres relationsFrom');
      },
      cursor: async function* (db: PgDb) {
        for (const row of await relationsFrom(
          db,
          start,
          mapData.collection,
          relation,
        )) {
          yield row as E;
        }
      },
    };
    return result;
  },

  create: (db: PgDb, data: T & { id?: string }) =>
    createDocument(
      db,
      mapData as MapData<O, O>,
      data as Record<string, unknown>,
    ),

  update: (db: PgDb, id: string, data: Partial<T>) =>
    updateDocument(
      db,
      mapData as MapData<O, O>,
      id,
      data as Record<string, unknown>,
    ).then(throwIfUndefined(`update ${mapData.collection} ${id}`)),

  delete: (db: PgDb, id: string) => deleteDocument(db, mapData, id),

  deleteRelations: (db: PgDb, id: string, relation: RelationWithMapping) =>
    deleteRelationsFor(db, id, relation).then(() => undefined),
});
