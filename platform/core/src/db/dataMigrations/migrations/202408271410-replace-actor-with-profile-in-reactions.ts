import { aql, Database } from 'arangojs';

export default {
  key: '0191942c-e79f-7bb4-9e28-59a30519225d',
  info: 'Replace actor with profile in reactions collection',
  migration: async (db: Database) => {
    if (await db.collection('reactions').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN reactions RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _from: doc._from.replace('actors', 'profiles'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('reactions').replace(doc._key, doc);
      }
    }
  },
};

