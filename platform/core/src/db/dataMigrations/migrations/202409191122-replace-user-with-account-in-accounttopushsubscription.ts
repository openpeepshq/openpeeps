import { aql, Database } from 'arangojs';

export default {
  key: '01920a04-a3f5-7b10-8a31-c55dfae82c6d',
  info: 'Replace user with account in accountToPushSubscription collection',
  migration: async (db: Database) => {
    if (await db.collection('accountToPushSubscription').exists()) {
      const collectionData = await (
        await db.query(aql`FOR doc IN accountToPushSubscription RETURN doc`)
      ).all();
      const newCollectionData = collectionData.map((doc) => {
        return {
          ...doc,
          _from: doc._from.replace('users', 'accounts'),
        };
      });

      for (const doc of newCollectionData) {
        await db
          .collection('accountToPushSubscription')
          .replace(doc._key, doc);
      }
    }
  },
};

