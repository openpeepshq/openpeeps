import { Database } from 'arangojs';

export default {
  key: '01920f6b-ebf7-719b-8da4-d99e4b082486',
  info: 'Rename user collection to account',
  migration: async (db: Database) => {
    if (await db.collection('users').exists()) {
      await db.collection('users').rename('accounts');
    }
  },
};
