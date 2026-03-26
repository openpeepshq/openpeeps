import { aql, Database } from 'arangojs';

export default {
  key: '0191942c-3931-779c-9d40-74be98aa4220',
  info: 'Replace actor with profile in entries collection',
  migration: async (db: Database) => {
    if (await db.collection('entries').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN entries RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _from: doc._from.replace('actors', 'profiles'),
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('entries').replace(doc._key, doc);
      }
    }
  },
};

