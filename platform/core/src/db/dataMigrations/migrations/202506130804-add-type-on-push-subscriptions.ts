import { aql, Database } from 'arangojs';

export default {
  key: '01976851-be8c-7115-a82a-27c540d5320a',
  info: 'Adding type on existing push subcriptions',
  migration: async (db: Database) => {
    const collection = db.collection('pushSubscriptions');
    if (await collection.exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN pushSubscriptions RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          type: 'web',
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('pushSubscriptions').replace(doc._key, doc);
      }
    }
  },
};
