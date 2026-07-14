import { Database } from 'arangojs';
import { GroupData } from '@openpeeps/common/types';
import { transformDocsInCollection } from '../helpers';

// Grant group moderators member management (and keep post moderation powers).
// Existing groups only had `core-posts-*` on the moderator relationship.
const MODERATOR_CAPABILITIES_TO_ADD = [
  'core-posts-*',
  'core-groups-addMember',
  'core-groups-removeMember',
] as const;

export default {
  key: '019f60a2-0b8c-75fb-8dda-7ceb672b719e',
  info: 'Grant group moderator member-management and post capabilities',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'groups', (doc) => {
      const group = doc as GroupData;
      const currentAdd = group.capabilities?.moderator?.add ?? [];
      const toAdd = MODERATOR_CAPABILITIES_TO_ADD.filter(
        (c) => !currentAdd.includes(c),
      );
      if (toAdd.length === 0) {
        return group;
      }

      return {
        ...group,
        capabilities: {
          ...group.capabilities,
          moderator: {
            ...group.capabilities?.moderator,
            add: [...currentAdd, ...toAdd],
          },
        },
      };
    }),
};
