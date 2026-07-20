import { Database } from 'arangojs';

const OLD_PREFIX = 'allpeep-';
const NEW_PREFIX = 'openpeeps-';

export default {
  key: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  info: 'Rename configuration document keys from allpeep-* to openpeeps-*',
  migration: async (db: Database) => {
    const collection = db.collection('configs');

    if (!(await collection.exists())) {
      return;
    }

    const cursor = await db.query(
      `FOR doc IN configs FILTER STARTS_WITH(doc._key, @prefix) RETURN doc`,
      { prefix: OLD_PREFIX },
    );

    for await (const doc of cursor) {
      const newKey = NEW_PREFIX + doc._key.slice(OLD_PREFIX.length);
      const { _id, _rev, _key, ...rest } = doc;
      await collection.save(
        { _key: newKey, ...rest },
        { overwriteMode: 'replace' },
      );
      await collection.remove(doc._id);
      console.log(`✅ Config key migrated: ${doc._key} → ${newKey}`);
    }
  },
};
