import { Database } from 'arangojs';

export default {
  key: '0191e638-ed19-721f-9aed-429714253ead',
  info: 'Remove logs collection',
  migration: async (db: Database) => {
    if (await db.collection('logs').exists()) {
      await db.collection('logs').drop();
    }
  },
};

