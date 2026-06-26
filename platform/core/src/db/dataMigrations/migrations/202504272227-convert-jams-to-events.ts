import { aql, Database } from 'arangojs';
import { ensureIndexedCollection } from '../../helpers';
import { collectionInfos } from '../../pg/collections';
import type { CollectionInfo } from '@openpeeps/arango-querybuilder';

export default {
  key: '0196795d-274b-7c51-9095-95880f9e815e',
  info: 'Convert jams to events and remove jams collection',
  migration: async (db: Database) => {
    if (await db.collection('jams').exists()) {
      if (!(await db.collection('posts').exists())) {
        await ensureIndexedCollection(
          db,
          collectionInfos.postsCollection as CollectionInfo,
        );
      }

      const jams = await (
        await db.query(aql`
          FOR jam IN jams
            RETURN jam
        `)
      ).all();

      for (const jam of jams) {
        const accessType = jam.accessType;
        const data = {
          _key: jam._key,
          type: 'event',
          visibility:
            accessType === 'open'
              ? 'public'
              : accessType === 'server'
                ? 'private'
                : 'local',
          data: {
            type: 'event',
            start: jam.startDate,
            name: jam.name,
            content: jam.description,
            end: jam.endDate,
            jam: {
              moderators: jam.moderators,
              speakers: jam.speakers,
              presenters: jam.presenters,
              audience: jam.audience,
              videoEnabled: jam.videoEnabled,
              type: jam.type,
              maxSpeakers: jam.maxSpeakers,
              maxPresenters: jam.maxPresenters,
              maxAudience: jam.maxAudience,
              waitingRoom: jam.waitingRoom,
            },
            locations: [{ type: 'jam', url: '/events/' + jam._key + '/jam' }],
            wholeDay: false,
            moderators: jam.moderators,
            createdBy: jam.createdBy,
            createdAt: jam.createdAt,
            updatedAt: jam.updatedAt,
          },
        };

        await db.collection('posts').save(data);
      }

      await db.collection('jams').drop();
    }
  },
};
