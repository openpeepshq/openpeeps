import { Database } from 'arangojs';

export default {
  key: '01920f80-0d50-7dee-a6cc-c78dc5200c32',
  info: 'Deleting index on username',
  migration: async (db: Database) => {
    const collection = db.collection('profiles');
    if (await collection.exists()) {
      await collection.dropIndex('unique-activityPub-identifiers');
    }
  },
};
