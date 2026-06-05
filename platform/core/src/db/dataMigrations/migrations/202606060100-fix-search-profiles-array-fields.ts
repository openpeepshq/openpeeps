import { Database } from 'arangojs';

export default {
  key: '019e99a4-a3fb-71a2-a96c-ce6667ad4ded',
  info:
    'Recreate search-profiles index and profileSearch view for profile fields array search',
  migration: async (db: Database) => {
    const collection = db.collection('profiles');
    if (await collection.exists()) {
      await collection.dropIndex('search-profiles');
    }

    const view = db.view('profileSearch');
    if (await view.exists()) {
      await view.drop();
    }
  },
};
