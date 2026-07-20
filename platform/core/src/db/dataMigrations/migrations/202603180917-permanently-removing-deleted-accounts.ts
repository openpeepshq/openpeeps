import { aql, Database } from 'arangojs';

export default {
  key: '65c54e29-c0f7-4336-8dbb-c250d8f6c5d5',
  info: 'Removing all deleted accounts, their push subscriptions, and connecting edges',
  migration: async (db: Database) => {
    if (await db.collection('accounts').exists()) {
      if (
        (await db.collection('pushSubscriptions').exists()) &&
        (await db.collection('accountToPushSubscription').exists())
      ) {
        const subscriptionsCursor = await db.query(aql`
          FOR account IN accounts
            FILTER account.deletedAt != null 
            FOR sub, edge IN 1..1 OUTBOUND account accountToPushSubscription
              REMOVE edge IN accountToPushSubscription
              REMOVE sub IN pushSubscriptions
              RETURN OLD._key
        `);
        const removedSubscriptions = await subscriptionsCursor.all();
        console.log(
          `Removed ${removedSubscriptions.length} subscriptions and their edges`,
        );
      }

      const cursor = await db.query(aql`
        FOR doc IN accounts
          FILTER doc.deletedAt != null
          REMOVE doc IN accounts
          RETURN OLD._key
      `);
      const removed = await cursor.all();
      console.log(`Removed ${removed.length} deleted accounts`);
    }
  },
};
