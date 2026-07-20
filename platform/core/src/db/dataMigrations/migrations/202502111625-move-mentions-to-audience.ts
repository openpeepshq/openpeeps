import { aql, Database } from 'arangojs';
import { ensureIndexedCollection } from '../../helpers';
import { collectionInfos } from '../../pg/collections';

export default {
  key: '0194f5d4-e347-7c4c-b26c-ec712812ae74',
  info: 'Copy mentions content to audience for direct messages only',
  migration: async (db: Database) => {
    if (await db.collection('mentions').exists()) {
      if (await db.collection('audience').exists()) {
        await db.collection('audience').drop();
      }
      const audienceCollection = await ensureIndexedCollection(
        db,
        collectionInfos.audienceCollection,
      );

      const directMessageMentions = await (
        await db.query(aql`
          FOR mention IN mentions
            FOR post IN posts
              FILTER post._id == mention._from
              FILTER post.visibility == 'direct'
              RETURN mention
        `)
      ).all();

      const newCollectionData = directMessageMentions.map((doc) => ({
        _key: doc._key,
        _rev: doc._rev,
        _from: doc._from,
        _to: doc._to,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      for (const doc of newCollectionData) {
        await audienceCollection.save(doc);
      }

      for (const doc of directMessageMentions) {
        await db.collection('mentions').remove(doc._key);
      }
    }
  },
};
