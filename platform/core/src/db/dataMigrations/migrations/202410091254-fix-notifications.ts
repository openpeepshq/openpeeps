import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';

export default {
  key: '01927158-191a-7ca9-bbd3-0c6cfe505731',
  info: 'Fixing notifications',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'notifications', (doc) => {
      const oldNotification = doc as {
        actorId?: string;
        profileId?: string;
        data: { profileId?: string; actorId?: string; postId?: string };
      };
      return {
        ...oldNotification,
        fromProfileId:
          oldNotification.data.actorId || oldNotification.data.profileId,
        postId: oldNotification.data.postId,
        profileId: oldNotification.actorId || oldNotification.profileId,
      };
    }),
};
