import { aql, Database } from 'arangojs';

export default {
  key: '0191942c-e79f-7bb4-9e28-59a30519225e',
  info: 'Replace actor with profile in controls collection',
  migration: async (db: Database) => {
    if (await db.collection('controls').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN controls RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _to: doc._to.replace('actors', 'profiles'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('controls').replace(doc._key, doc);
      }
    }
  },
};
