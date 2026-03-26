import { aql, Database } from 'arangojs';

export default {
  key: '0191942c-8280-76d1-a7a1-8caa454ea5ab',
  info: 'Replace actor with profile in hasRole collection',
  migration: async (db: Database) => {
    if (await db.collection('hasRole').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN hasRole RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _from: doc._from.replace('actors', 'profiles'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('hasRole').replace(doc._key, doc);
      }
    }
  },
};

