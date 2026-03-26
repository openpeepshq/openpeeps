import { aql, Database } from 'arangojs';

export default {
  key: '019131ae-e429-7d15-bd25-6ed89b04952d',
  info: 'Replace actor with profile in follows collection',
  migration: async (db: Database) => {
    if (await db.collection('follows').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN follows RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _to: doc._to.replace('actors', 'profiles'),
          _from: doc._from.replace('actors', 'profiles'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('follows').replace(doc._key, doc);
      }
    }
  },
};

