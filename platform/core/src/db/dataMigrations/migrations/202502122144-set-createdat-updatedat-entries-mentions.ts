import { aql, Database } from 'arangojs';
import { ensureIndexedCollection } from '../helpers';
import { collectionInfos } from '../../pg/collections';

export default {
  key: '0194fc1f-13ea-72f7-8954-0609b77af91e',
  info: 'Generate and set createdAt and updatedAt entries for mentions',
  migration: async (db: Database) => {
    if (await db.collection('mentions').exists()) {
      const mentionsCollection = await ensureIndexedCollection(
        db,
        collectionInfos.mentionsCollection,
      );

      const mentions = await (
        await db.query(aql`
            FOR mention IN mentions
              RETURN mention
          `)
      ).all();

      for (const doc of mentions) {
        if (!doc.createdAt) {
          await mentionsCollection.update(doc._key, {
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
    if (await db.collection('entries').exists()) {
      const entriesCollection = await ensureIndexedCollection(
        db,
        collectionInfos.entriesCollection,
      );

      const entries = await (
        await db.query(aql`
            FOR entry IN entries
              RETURN entry
          `)
      ).all();

      for (const doc of entries) {
        if (!doc.createdAt) {
          await entriesCollection.update(doc._key, {
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  },
};
