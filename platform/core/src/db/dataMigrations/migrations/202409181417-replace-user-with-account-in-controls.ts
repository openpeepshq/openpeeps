import { aql, Database } from 'arangojs';

export default {
  key: '0192057e-f212-76b1-9e54-b5518c2927c7',
  info: 'Replace user with account in controls collection',
  migration: async (db: Database) => {
    if (await db.collection('controls').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN controls RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _from: doc._from.replace('users', 'accounts'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('controls').replace(doc._key, doc);
      }
    }
  },
};

