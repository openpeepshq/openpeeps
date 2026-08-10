import { query } from '@openpeepshq/arango-querybuilder';
import { Database } from 'arangojs';
import { postsMapping } from '../../../posts/mapping';
import { logger } from '../../../log';

const log = logger('db:dataMigrations:add-data-to-post');

export default {
  key: '019802f2-b27a-72c3-9ca1-fc344b72b66b',
  info: 'Add data to post',
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
      for await (const post of await postsMapping.cursor(db)) {
        try {
          await postsCollection.update(post.id, {
            data: post.data,
            type: post.data.type,
          });
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
