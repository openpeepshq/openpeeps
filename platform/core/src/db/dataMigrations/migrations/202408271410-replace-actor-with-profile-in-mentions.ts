import { aql, Database } from 'arangojs';

export default {
  key: '0191942c-a90e-71e6-846f-7dc882c8c00b',
  info: 'Replace actor with profile in mentions collection',
  migration: async (db: Database) => {
    if (await db.collection('mentions').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN mentions RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _to: doc._to.replace('actors', 'profiles'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('mentions').replace(doc._key, doc);
      }
    }
  },
};
