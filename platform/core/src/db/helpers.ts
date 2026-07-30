import { Database } from 'arangojs';
import {
  ArangoCollection,
  CollectionType,
  DocumentCollection,
  EdgeCollection,
} from 'arangojs/collections';
import {
  Document,
  DocumentMetadata,
  Edge,
  EdgeMetadata,
  Patch,
} from 'arangojs/documents';
import { uuidv7 } from 'uuidv7';
import type { Base } from '@openpeeps/common/types';
import {
  collectionElement,
  type Filter,
  query,
  literal,
} from '@openpeeps/arango-querybuilder';
import type { CollectionInfo, ViewInfo } from './pg/map/queryTypes';
import type { Limit, Mapping, ObjectSort, WithId } from './pg/map';
import type { PgQueryResult } from './pg/map/types';
import type { PgDb } from './pg/client';
import { deleteEdge as deletePgEdge, insertEdge } from './pg/helpers';
import { asTable, edgeRegistry } from './pg/map/registry';
import { nowIso } from './pg/mappers';
import { and, eq } from 'drizzle-orm';
import { documentKeyAfter, documentKeyBefore } from './pg/filters';
import { sorts } from './pg/queries';
import { EdgeDefinition, EdgeDefinitionOptions } from 'arangojs/graphs';
import { asyncFilter } from '@openpeeps/common/lib';
import { EnsureIndexOptions } from 'arangojs/indexes';
import { logger } from '../log';
import {
  FilterAndTransformOptions,
  ObjectFilter,
  UserFunctionDefinition,
} from './types';

const log = logger('openpeeps:db');

const collectionName = (collectionOrName: ArangoCollection | string) =>
  typeof collectionOrName === 'string'
    ? collectionOrName
    : collectionOrName.name;

export const addModificationDates = async (collection: DocumentCollection) => {
  await collection.properties({
    computedValues: [
      {
        name: 'createdAt',
        expression: 'RETURN DATE_ISO8601(DATE_NOW())',
        computeOn: ['insert'],
        overwrite: false,
        failOnWarning: false,
        keepNull: true,
      },
      {
        name: 'updatedAt',
        expression: 'RETURN DATE_ISO8601(DATE_NOW())',
        computeOn: ['update', 'replace', 'insert'],
        overwrite: false,
        failOnWarning: false,
        keepNull: true,
      },
    ],
  });
};

export const addIndices = async (
  collection: DocumentCollection | EdgeCollection,
  indices: EnsureIndexOptions[],
) => {
  for (const index of indices) {
    if (!index.name) {
      return;
    }
    try {
      log.info('ensuring index', index.name);
      await collection.ensureIndex(index);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('duplicate value')) {
        log.info('index already exists', index.name);
        log.info('dropping and recreating...');
        await collection.dropIndex(index.name);
        await collection.ensureIndex(index);
        log.info('index recreated');
      } else {
        log.error('error ensuring index', index.name, message);
      }
    }
  }
};

export const ensureIndexedCollection = async <
  T extends Record<string, unknown>,
>(
  db: Database,
  collectionInfo: CollectionInfo,
): Promise<DocumentCollection<Base<T>, T>> => {
  const maybeCollection = db.collection(collectionInfo.name);
  const collection = (await maybeCollection.exists())
    ? maybeCollection
    : collectionInfo.edge
      ? await db.createEdgeCollection<Base<T>, T>(collectionInfo.name)
      : await db.createCollection<Base<T>, T>(collectionInfo.name);
  await addModificationDates(collection);
  await addIndices(
    collection,
    (collectionInfo.indices ?? []) as EnsureIndexOptions[],
  );
  return collection;
};

const isEqualView = (viewInfo1: ViewInfo, viewInfo2: ViewInfo) =>
  viewInfo1.indexes.length === viewInfo2.indexes.length &&
  viewInfo1.indexes.every((index1) =>
    viewInfo2.indexes.find(
      (index2) =>
        index1.collection === index2.collection &&
        index1.index === index2.index,
    ),
  ) &&
  viewInfo2.indexes.every((index2) =>
    viewInfo1.indexes.find(
      (index1) =>
        index1.collection === index2.collection &&
        index1.index === index2.index,
    ),
  );

export const ensureView = async (db: Database, viewInfo: ViewInfo) => {
  const view = db.view(viewInfo.name);
  if (await view.exists()) {
    const viewData = await view.properties();
    if (viewData.type === 'search-alias' && isEqualView(viewData, viewInfo)) {
      return view;
    } else {
      await view.drop();
    }
  }
  await view.create(viewInfo);
};

const replaceEdgeDefinition =
  (db: Database) => (edgeDefinition: EdgeDefinitionOptions) =>
    db
      .listGraphs()
      .then((graphInfos) => graphInfos.map((gi) => gi.edgeDefinitions).flat())
      .then(
        (edgeDefinitions) =>
          edgeDefinitions.find(
            (ed) => ed.collection === edgeDefinition.collection,
          ) || edgeDefinition,
      );

export const ensureGraph = async (
  db: Database,
  name: string,
  edgeDefinitions: EdgeDefinitionOptions[],
) => {
  const replacedEdgeDefinitions: (EdgeDefinitionOptions | EdgeDefinition)[] =
    await Promise.all(edgeDefinitions.map(replaceEdgeDefinition(db)));

  const graph = db.graph(name);
  if (await graph.exists()) {
    const edgeDefinitionsToAdd = await asyncFilter(
      replacedEdgeDefinitions,
      (ed) =>
        graph
          .listEdgeCollections()
          .then((ecs) => !ecs.includes(collectionName(ed.collection))),
    );
    const edgeDefinitionsToRemove = await graph
      .listEdgeCollections()
      .then((ecs) =>
        ecs.filter(
          (ec) =>
            !replacedEdgeDefinitions
              .map((ed) => collectionName(ed.collection))
              .includes(ec),
        ),
      );
    for (const edgeDefinition of edgeDefinitionsToAdd) {
      await graph.addEdgeDefinition(edgeDefinition);
    }
    for (const edgeDefinitionCollectionName of edgeDefinitionsToRemove) {
      await graph.removeEdgeDefinition(edgeDefinitionCollectionName);
    }
  } else {
    return await db.createGraph(name, replacedEdgeDefinitions);
  }
  return graph;
};

export const ensureFunction = async (
  db: Database,
  { name, dbFunction }: UserFunctionDefinition,
) => {
  console.log('--------------------------------');
  console.log('ensureFunction', name);
  console.log('--------------------------------');
  console.log(dbFunction.toString());
  console.log('--------------------------------');
  db.createUserFunction(`ALLPEEP::${name}`, dbFunction.toString(), true);
};

const setId = <T extends object>(document: Document<T>): WithId<T> => ({
  ...document,
  id: document._key,
});

export const createEdge = async <T extends object | {} = {}>(
  collection: EdgeCollection<Base<T>, T>,
  document: T & EdgeMetadata & { id?: string },
): Promise<WithId<Base<T>>> => {
  const data = {
    ...document,
    _key: document.id ?? uuidv7(),
  };
  const createdEdge = (await collection.save(data, { returnNew: true })).new;
  if (createdEdge) {
    return setId(createdEdge);
  } else {
    throw Error(`Edge in collection ${collection.name} could not be created.`);
  }
};
export const updateEdge = async <
  T extends Record<string, unknown> & EdgeMetadata,
>(
  collection: EdgeCollection<Base<T>>,
  documentKey: string,
  document: Patch<Document<Base<T>>>,
): Promise<Document<Base<T>> | undefined> =>
  (await collection.update(documentKey, document, { returnNew: true })).new;

export const deleteEdge = async <
  T extends Record<string, unknown> & Base<EdgeMetadata>,
>(
  collection: EdgeCollection<Base<T>>,
  documentKey: string,
): Promise<DocumentMetadata & { old?: Edge<Base<T>> | undefined }> =>
  await collection.remove(documentKey);

export const findOneBy =
  <O extends object>(db: Database, collectionInfo: CollectionInfo) =>
  (filter: Filter) =>
    query<O>().collection(collectionInfo.name).filter(filter).first(db);

export const edgeCollections = async (database: Database) =>
  database
    .collections()
    .then((collections) =>
      asyncFilter(collections, async (c) =>
        c.properties().then((p) => p.type === CollectionType.EDGE_COLLECTION),
      ),
    );

const getEdge = async <T extends object>(
  db: Database,
  collection: EdgeCollection<Base<T>>,
  from: string,
  to: string,
) =>
  findOneBy<T>(
    db,
    collection,
  )({
    name: literal(collectionElement(collection)),
    matches: { _from: from, _to: to },
  });

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
    E extends object | {} = {},
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
    fromCollectionInfo: CollectionInfo,
    toCollectionInfo: CollectionInfo,
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
    C extends Record<string, unknown> | undefined = {},
  >(
    fromCollectionInfo: CollectionInfo,
    toCollectionInfo: CollectionInfo,
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
    C extends Record<string, unknown> = {},
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

export const filterAndTransform = async <
  I extends object,
  O extends object = I,
>(
  queryResult: PgQueryResult<I>,
  db: PgDb,
  options: FilterAndTransformOptions<I, O>,
) => {
  const {
    filter = (_: O) => true,
    transform = async (i: I) => i as unknown as O,
    limit = 100,
    offset = 0,
  } = options;
  const result: O[] = [];
  let pageOffset = 0;
  while (result.length < limit) {
    const nextPageLength = (limit - result.length) * 2;
    const list = await queryResult
      .limit(buildLimit(nextPageLength, offset + pageOffset))
      .all(db);
    const filteredList = await Promise.all(list.map(transform)).then((items) =>
      items.filter(filter),
    );
    result.push(...filteredList.slice(0, limit - result.length));
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
