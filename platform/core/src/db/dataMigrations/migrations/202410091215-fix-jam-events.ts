import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';

export default {
  key: '01927134-8082-727f-9df0-1c152a020e33',
  info: 'Fixing jam events',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'jamEvents', (doc) => {
      const oldJamEvent = doc as {
        sender: { participantId: string; actor: unknown };
      };
      return oldJamEvent.sender.actor
        ? {
          ...oldJamEvent,
          sender: {
            participantId: oldJamEvent.sender.participantId,
            profile: oldJamEvent.sender.actor,
          },
        }
        : oldJamEvent;
    }),
};

