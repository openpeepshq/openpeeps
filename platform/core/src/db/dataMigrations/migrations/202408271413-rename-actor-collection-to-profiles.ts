import { Database } from 'arangojs';

export default {
  key: '0191942f-4766-7d9c-b71f-5497a39ae774',
  info: 'Rename actor collection to profiles',
  migration: async (db: Database) => {
    if (await db.collection('actors').exists()) {
      await db.collection('actors').rename('profiles');
    }
  },
};

