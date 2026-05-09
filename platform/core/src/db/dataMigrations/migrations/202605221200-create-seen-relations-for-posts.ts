import { aql, Database } from 'arangojs';
import { collectionInfos } from '../../structure';
import { logger } from '../../../log';

const log = logger('db:dataMigrations');

export default {
  key: 'fe0b8833-3c12-467c-8968-9a9a8accb4bb',
  info: 'Create seen relations for existing direct messages and group posts',
  migration: async (db: Database) => {
    const postSeen = db.collection(collectionInfos.postSeenCollection.name);

    if (!(await postSeen.exists())) {
      log.info('postSeen collection does not exist, skipping migration');
      return;
    }

    const groupPostsCursor = await db.query(aql`
      FOR membership IN ${db.collection(collectionInfos.userGroupsCollection.name)}
        LET profile = DOCUMENT(membership._from)
        FILTER profile != null && profile.deletedAt == null
        FOR postEdge IN ${db.collection(collectionInfos.postGroupsCollection.name)}
          FILTER postEdge._to == membership._to
          LET post = DOCUMENT(postEdge._from)
          FILTER post != null && post.deletedAt == null
          LET alreadySeen = LENGTH(
            FOR seen IN ${postSeen}
              FILTER seen._from == membership._from && seen._to == post._id
              LIMIT 1
              RETURN 1
          ) > 0
          FILTER !alreadySeen
          INSERT { _from: membership._from, _to: post._id } INTO ${postSeen}
          RETURN NEW
    `);

    const groupPostSeenEdges = await groupPostsCursor.all();
    log.info(`Created ${groupPostSeenEdges.length} seen relations for group posts`);

    const directMessagesCursor = await db.query(aql`
      FOR profile IN ${db.collection(collectionInfos.profilesCollection.name)}
        FILTER profile.deletedAt == null
        FOR post IN ${db.collection(collectionInfos.postsCollection.name)}
          FILTER post.visibility == 'direct' && post.deletedAt == null
          LET inAudience = LENGTH(
            FOR audienceEdge IN ${db.collection(collectionInfos.audienceCollection.name)}
              FILTER audienceEdge._from == post._id && audienceEdge._to == profile._id
              LIMIT 1
              RETURN 1
          ) > 0
          LET isAuthor = LENGTH(
            FOR entry IN ${db.collection(collectionInfos.entriesCollection.name)}
              FILTER entry._from == profile._id && entry._to == post._id && entry.type == 'create'
              LIMIT 1
              RETURN 1
          ) > 0
          FILTER inAudience || isAuthor
          FOR threadPost IN UNION_DISTINCT(
            [post],
            (
              FOR ancestor IN 1..999 OUTBOUND post ${db.collection(collectionInfos.repliesCollection.name)}
                FILTER ancestor.deletedAt == null
                RETURN ancestor
            ),
            (
              FOR descendant IN 1..999 INBOUND post ${db.collection(collectionInfos.repliesCollection.name)}
                FILTER descendant.deletedAt == null
                RETURN descendant
            )
          )
            FILTER threadPost.deletedAt == null
            LET alreadySeen = LENGTH(
              FOR seen IN ${postSeen}
                FILTER seen._from == profile._id && seen._to == threadPost._id
                LIMIT 1
                RETURN 1
            ) > 0
            FILTER !alreadySeen
            INSERT { _from: profile._id, _to: threadPost._id } INTO ${postSeen}
            RETURN NEW
    `);

    const directMessageSeenEdges = await directMessagesCursor.all();
    log.info(`Created ${directMessageSeenEdges.length} seen relations for direct messages`);
  },
};
