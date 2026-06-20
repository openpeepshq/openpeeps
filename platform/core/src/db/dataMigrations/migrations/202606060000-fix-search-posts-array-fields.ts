import { Database } from 'arangojs';

export default {
  key: '019e99a8-8f2a-7c31-b4e2-9a8f3c1d2e4f',
  info: 'Recreate search-posts index and postSearch view for poll/attachment array search',
  migration: async (db: Database) => {
    const collection = db.collection('posts');
    if (await collection.exists()) {
      await collection.dropIndex('search-posts');
    }

    const view = db.view('postSearch');
    if (await view.exists()) {
      await view.drop();
    }
  },
};
