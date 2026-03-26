import { Database } from "arangojs";
import { transformDocsInCollection } from "../helpers";
import { JamEvent } from "@openpeeps/common/types";


const convertJamEventType = (type: string, content: string): JamEvent['type'] => {
  switch (type) {
    case 'message':
      return 'message';
    case 'reaction':
      return 'reaction';
    case 'attendance':
      return content === '👋' ? 'join' : 'leave';
    case 'active':
      return ['start', 'close'].includes(content) ? content as JamEvent['type'] : 'message';
    default:
      return 'message';
  }
};

export default {
  key: '0198a7fc-72d1-7a2f-8c15-7d1bd0f0d109',
  info: 'Update jam events',
  migration: async (db: Database) => transformDocsInCollection(db, 'jamEvents', (doc) => {
    const oldJamEvent = doc as { jamId: string, type: string, content: string, createdAt: string, updatedAt: string, sender: { participantId: string } };
    const newJamEvent: Omit<JamEvent, 'id'> = {
      jamId: oldJamEvent.jamId,
      type: convertJamEventType(oldJamEvent.type, oldJamEvent.content),
      profileId: oldJamEvent.sender.participantId,
      content: ['message', 'reaction'].includes(oldJamEvent.type) ? oldJamEvent.content : undefined,
      createdAt: oldJamEvent.createdAt,
      updatedAt: oldJamEvent.updatedAt,
    };
    return newJamEvent;
  }),
};
