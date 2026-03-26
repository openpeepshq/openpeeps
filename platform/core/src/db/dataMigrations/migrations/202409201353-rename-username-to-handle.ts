import { aql, Database } from 'arangojs';

export default {
  key: '01920fb5-1afb-70e4-9f8a-f47b6b49918b',
  info: 'Renaming username to handle',
  migration: async (db: Database) => {
    const collection = db.collection('profiles');
    if (await collection.exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN profiles RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          username: undefined,
          handle: doc.username,
        };
      });

      for (const doc of newCollectionData) {
        await db.collection('profiles').replace(doc._key, doc);
      }
    }
  },
};

