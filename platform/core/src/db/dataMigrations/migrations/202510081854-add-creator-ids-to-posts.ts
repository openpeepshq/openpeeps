import { Database } from 'arangojs';
import { query } from '@openpeeps/arango-querybuilder';
import { logger } from '../../../log';
import { postsMapping } from '../../../posts/mapping';
import { retrievePaged } from '../../helpers';

const log = logger('db:dataMigrations:add-creator-ids-to-posts');

export default {
  key: '0199c52d-2bf0-74e8-9a2f-ff65fd5b7b6a',
  info: 'Add creator ids to posts for easier filtering',
  migration: async (db: Database) => {
    const postsCollection = db.collection('posts');
    if (await postsCollection.exists()) {
      const postCount = await query().collection('posts').count(db);
      if (postCount === 0) {
        log.info('No posts to update');
        return;
      }
      log.info(`Updating ${postCount} posts...`);

      const startTimestamp = Date.now();
      let count = 0;
      for (const post of await retrievePaged(postsMapping, db)) {
        try {
          await postsCollection.update(post.id, { creatorId: post.profile.id });
          count++;
        } catch (error) {
          await postsCollection.remove(post.id);
          log.error(`Error updating post ${post.id}: ${error}`);
        }
      }
      log.info(`Updated ${count} posts in ${Date.now() - startTimestamp}ms`);
    }
  },
};
