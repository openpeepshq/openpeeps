import { Database } from 'arangojs';
import { GroupData } from '@openpeeps/common/types';
import { transformDocsInCollection } from '../helpers';

const MODERATOR_CAPS = [
  'core-posts-*',
  'core-groups-addMember',
  'core-groups-removeMember',
] as const;

export default {
  key: '019f897f-dbc8-751a-95d3-d183081404fb',
  info: 'Grant group moderators post and member-management capabilities',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'groups', (doc) => {
      const group = doc as GroupData;
      const currentAdd = group.capabilities?.moderator?.add ?? [];
      const toAdd = MODERATOR_CAPS.filter((c) => !currentAdd.includes(c));
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
