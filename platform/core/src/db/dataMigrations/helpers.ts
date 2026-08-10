import { EdgeCollection } from 'arangojs/collections';
import { Database } from 'arangojs';
import { EdgeData } from 'arangojs/documents';
import { FollowData } from '@openpeepshq/common/types';
import { query } from '@openpeepshq/arango-querybuilder';
import { asyncFilter } from '@openpeepshq/common/lib';

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
