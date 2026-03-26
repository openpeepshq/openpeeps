import { aql, Database } from "arangojs";
import { CollectionType, DocumentCollection, EdgeCollection } from "arangojs/collections";
import { asyncFilter } from "@openpeeps/common/lib";
import { logger } from "../../../log";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const log = logger('db:dataMigrations');

const collectionNamesToFix = [
  'inviteLinks',
  'roles',
  'reports',
  'hashtags',
  'pushSubscriptions',
  'jamEvents',
  'groups',
  'accounts',
  'mediaAttachments',
  'profiles',
  'posts',
  'notifications',
];

const removeDocument = async (db: Database, collection: DocumentCollection, key: string, edgeCollections: EdgeCollection[]) => {

  await collection.remove(key);

  const removedEdgesCounts = await Promise.all(edgeCollections.map(async (edgeCollection) => {
    const edgeKeys = await db.query<string>(aql`FOR edge IN ${edgeCollection} FILTER edge._from == ${collection.documentId(key)} || edge._to == ${collection.documentId(key)} RETURN edge._key`).then(r => r.all());
    await Promise.all(edgeKeys.map(edge => edgeCollection.remove(edge))).catch(e => {
      log.error(`Error removing edge from ${edgeCollection.name}: ${e}`);
    });
    return edgeKeys.length;
  }));

  return removedEdgesCounts.reduce((acc, count) => acc + count, 0);

};

const fixCollection = async (db: Database, collection: DocumentCollection, edgeCollections: EdgeCollection[]) => {
  const badKeys = await db.query<string>(aql`FOR doc IN ${collection} RETURN doc._key`)
    .then(r => r.all())
    .then(keys => keys.filter(k => !uuidPattern.test(k)));

  const removedDocumentsCounts = await Promise.all(badKeys.map(key => removeDocument(db, collection, key, edgeCollections)));

  log.info(`Removed ${badKeys.length} documents and ${removedDocumentsCounts.reduce((acc, count) => acc + count, 0)} edges for ${collection.name}`);

};


export default {
  key: '019a5356-575b-7034-8465-442eecadff0c',
  info: 'Fixing bad ids',
  migration: async (db: Database) => {
    log.info('Fixing bad ids ...');



    const allCollections = await db.collections();
    const docCollections = collectionNamesToFix.map(name => allCollections.find(c => c.name === name)).filter(Boolean) as DocumentCollection[];
    const edgeCollections = await asyncFilter(allCollections, c => c.properties().then(p => p.type === CollectionType.EDGE_COLLECTION));

    await Promise.all(docCollections.map(collection => fixCollection(db, collection, edgeCollections)));
  }
};
