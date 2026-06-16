import { aql, Database } from 'arangojs';
import { logger } from '../../../log';

const log = logger('db:dataMigrations:normalize-hashtag-case');

type HashtagDoc = {
  _key: string;
  tag?: string;
};

type PostHashtagEdge = {
  _key: string;
  _from: string;
  _to: string;
};

export default {
  key: '019ecf9b-242d-7560-9ecc-a65a30aa64fc',
  info: 'Normalize hashtag tags to lowercase and merge case-variant duplicates',
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

    const allHashtags = await db
      .query(aql`FOR h IN hashtags RETURN h`)
      .then((r) => r.all() as Promise<HashtagDoc[]>);

    const nonNormalized = allHashtags.filter(
      (h) => h.tag && h.tag !== h.tag.toLowerCase(),
    );

    if (nonNormalized.length === 0) {
      log.info('No case-variant hashtags found');
      return;
    }

    log.info(`Found ${nonNormalized.length} hashtags to normalize`);

    let fixedCount = 0;

    for (const hashtag of nonNormalized) {
      try {
        if (!hashtag.tag) continue;

        const normalizedTag = hashtag.tag.toLowerCase();

        const existingHashtag = await db
          .query(
            aql`
              FOR h IN hashtags
              FILTER h.tag == ${normalizedTag} && h._key != ${hashtag._key}
              LIMIT 1
              RETURN h
            `,
          )
          .then((r) => r.next() as Promise<HashtagDoc | undefined>);

        if (existingHashtag) {
          log.info(
            `Merging hashtag "${hashtag.tag}" with existing "${normalizedTag}"`,
          );

          const connections = await db
            .query(
              aql`
                FOR edge IN postHashtags
                FILTER edge._to == ${hashtagsCollection.documentId(hashtag._key)}
                RETURN edge
              `,
            )
            .then((r) => r.all() as Promise<PostHashtagEdge[]>);

          for (const edge of connections) {
            const existingConnection = await db
              .query(
                aql`
                  FOR e IN postHashtags
                  FILTER e._from == ${edge._from}
                    && e._to == ${hashtagsCollection.documentId(existingHashtag._key)}
                  LIMIT 1
                  RETURN e
                `,
              )
              .then((r) => r.next());

            if (!existingConnection) {
              await postHashtagsCollection.save({
                _from: edge._from,
                _to: hashtagsCollection.documentId(existingHashtag._key),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }

            await postHashtagsCollection.remove(edge._key);
          }

          await hashtagsCollection.remove(hashtag._key);
        } else {
          log.info(
            `Normalizing hashtag in place: "${hashtag.tag}" -> "${normalizedTag}"`,
          );

          await hashtagsCollection.update(hashtag._key, {
            tag: normalizedTag,
            updatedAt: new Date().toISOString(),
          });
        }

        fixedCount++;
      } catch (error) {
        log.error(`Error processing hashtag "${hashtag.tag}":`, error);
      }
    }

    log.info(`Migration completed: normalized ${fixedCount} hashtags`);
  },
};
