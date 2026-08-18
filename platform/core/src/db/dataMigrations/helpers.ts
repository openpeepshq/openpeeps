import { DocumentCollection, EdgeCollection } from 'arangojs/collections';
import { Database } from 'arangojs';
import { EdgeData } from 'arangojs/documents';
import { EnsureIndexOptions } from 'arangojs/indexes';
import { FollowData } from '@openpeepshq/common/types';
import type { Base } from '@openpeepshq/common/types';
import { query } from '@openpeepshq/arango-querybuilder';
import { asyncFilter } from '@openpeepshq/common/lib';
import type { CollectionInfo } from '../pg/map/queryTypes';
import { logger } from '../../log';

const log = logger('openpeeps:db');

export const makeEdgesUnique = async (
  db: Database,
  collection: EdgeCollection,
) => {
  const edges: EdgeData<FollowData>[] = await query<EdgeData<FollowData>>()
    .collection(collection)
    .all(db);

  const keyedEdges = edges.map((f) => [`${f._from}-${f._to}`, f._id]);

  const groupedEdgeIds: Record<string, string[]> = keyedEdges.reduce(
    (groupHolder, keyedEdge) => {
      if (groupHolder[keyedEdge[0] as string]) {
        groupHolder[keyedEdge[0] as string].push(keyedEdge[1] as string);
      } else {
        groupHolder[keyedEdge[0] as string] = [keyedEdge[1] as string];
      }
      return groupHolder;
    },
    {} as Record<string, string[]>,
  );

  for (const edgeIds of Object.values(groupedEdgeIds)) {
    for (const id of edgeIds.slice(1)) {
      await collection.remove(id);
    }
  }
};

export const transformDocsInCollection = async (
  db: Database,
  tableName: string,
  transformer: (input: unknown) => unknown,
) => {
  const collection = db.collection(tableName);
  if (await collection.exists()) {
    const collectionDataCursor = await db.query(
      `FOR doc IN ${tableName} RETURN doc`,
    );
    for await (const doc of collectionDataCursor) {
      await db.collection(tableName).replace(doc._key, transformer(doc));
    }
  }
};

export const documentExists = async (
  database: Database,
  id: string,
): Promise<boolean> =>
  database.collection(id.split('/')[0])?.documentExists(id);

export const edgeCollections = async (database: Database) =>
  database
    .collections()
    .then((collections) =>
      asyncFilter(collections, async (c) =>
        c
          .properties()
          .then((p) => p.type === 3 /* CollectionType.EDGE_COLLECTION */),
      ),
    );

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
