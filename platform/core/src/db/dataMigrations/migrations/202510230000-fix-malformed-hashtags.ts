import { aql, Database } from 'arangojs';
import { logger } from '../../../log';

const log = logger('db:dataMigrations:fix-malformed-hashtags');

export default {
  key: '01a19837-edf6-43db-8953-6c19ecaab122',
  info: 'Fix malformed hashtags created by old regex pattern',
  migration: async (db: Database) => {
    const hashtagsCollection = db.collection('hashtags');
    const postHashtagsCollection = db.collection('postHashtags');

    if (
      !(await hashtagsCollection.exists()) ||
      !(await postHashtagsCollection.exists())
    ) {
      log.info('Required collections do not exist, skipping migration');
      return;
    }

    // Get all hashtags and filter malformed ones in JavaScript
    const allHashtags = await db
      .query(aql`FOR h IN hashtags RETURN h`)
      .then((r) => r.all());
    const malformedHashtags = allHashtags.filter(
      (h: any) => h.tag && /[^a-zA-Z0-9_-]/.test(h.tag),
    );

    if (malformedHashtags.length === 0) {
      log.info('No malformed hashtags found');
      return;
    }

    log.info(`Found ${malformedHashtags.length} malformed hashtags to fix`);

    let fixedCount = 0;

    for (const malformedHashtag of malformedHashtags) {
      try {
        if (!malformedHashtag.tag) continue;

        // Extract valid alphanumeric part from the beginning of the tag
        const validTag = malformedHashtag.tag.match(/^([a-zA-Z0-9_-]+)/)?.[1];

        if (!validTag || validTag === malformedHashtag.tag) {
          continue;
        }

        // Check if a hashtag with the cleaned tag already exists
        const existingHashtag = await db
          .query(
            aql`
                    FOR h IN hashtags 
                    FILTER h.tag == ${validTag} && h._key != ${malformedHashtag._key}
                    LIMIT 1
                    RETURN h
                `,
          )
          .then((r) => r.next());

        if (existingHashtag) {
          // If a clean version already exists, we need to merge connections and remove the malformed one
          log.info(
            `Merging malformed hashtag "${malformedHashtag.tag}" with existing clean hashtag "${validTag}"`,
          );

          // Move all connections from malformed to existing clean hashtag
          const connections = await db
            .query(
              aql`
                        FOR edge IN postHashtags 
                        FILTER edge._to == ${hashtagsCollection.documentId(malformedHashtag._key)}
                        RETURN edge
                    `,
            )
            .then((r) => r.all());

          for (const edge of connections) {
            // Check if connection to clean hashtag already exists
            const existingConnection = await db
              .query(
                aql`
                            FOR e IN postHashtags 
                            FILTER e._from == ${(edge as any)._from} && e._to == ${hashtagsCollection.documentId(existingHashtag._key)}
                            LIMIT 1
                            RETURN e
                        `,
              )
              .then((r) => r.next());

            if (!existingConnection) {
              // Create new connection to clean hashtag
              await postHashtagsCollection.save({
                _from: (edge as any)._from,
                _to: hashtagsCollection.documentId(existingHashtag._key),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }

            // Remove old connection
            await postHashtagsCollection.remove((edge as any)._key);
          }

          // Remove the malformed hashtag since we merged it with the existing clean one
          await hashtagsCollection.remove(malformedHashtag._key);
        } else {
          // No existing clean hashtag, so just update this one in place
          log.info(
            `Fixing hashtag in place: "${malformedHashtag.tag}" -> "${validTag}"`,
          );

          await hashtagsCollection.update(malformedHashtag._key, {
            tag: validTag,
            updatedAt: new Date().toISOString(),
          });
        }

        fixedCount++;
      } catch (error) {
        log.error(`Error processing hashtag "${malformedHashtag.tag}":`, error);
      }
    }

    log.info(`Migration completed: fixed ${fixedCount} malformed hashtags`);
  },
};
