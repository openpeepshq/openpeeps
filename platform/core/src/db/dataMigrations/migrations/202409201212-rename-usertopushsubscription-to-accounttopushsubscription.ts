import { Database } from 'arangojs';

export default {
  key: '01920f58-dcc7-7b86-b0fc-03e7536aae93',
  info: 'Rename userToPushSubscription collection to accountToPushSubscription',
  migration: async (db: Database) => {
    if (await db.collection('userToPushSubscription').exists()) {
      await db
        .collection('userToPushSubscription')
        .rename('accountToPushSubscription');
    }
  },
};

