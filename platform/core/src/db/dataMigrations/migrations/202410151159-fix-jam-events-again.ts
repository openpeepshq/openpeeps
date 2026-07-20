import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';

export default {
  key: '0192900c-5b17-7dd8-8afd-d6c6c160ad8e',
  info: 'Fixing jam events again',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'jamEvents', (doc) => {
      const oldJamEvent = doc as {
        sender: { participantId: string; profile: { username?: string } };
      };
      return oldJamEvent.sender?.profile?.username
        ? {
            ...oldJamEvent,
            sender: {
              participantId: oldJamEvent.sender.participantId,
              profile: {
                ...oldJamEvent.sender.profile,
                handle: oldJamEvent.sender.profile.username,
              },
            },
          }
        : oldJamEvent;
    }),
};
