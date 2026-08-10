import { Database } from 'arangojs';
import { GroupData } from '@openpeepshq/common/types';
import { hasMemberOnlyPostsVisibility } from '@openpeepshq/common/lib';
import { transformDocsInCollection } from '../helpers';

export default {
  key: '019f2a10-8c40-7f2a-b0a0-000000000001',
  info: 'Grant core-posts-read to members on groups with member-only post visibility',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'groups', (doc) => {
      const group = doc as GroupData;
      if (!hasMemberOnlyPostsVisibility(group.capabilities)) {
        return group;
      }

      const memberAdd = group.capabilities?.member?.add ?? [];
      if (memberAdd.includes('core-posts-read')) {
        return group;
      }

      return {
        ...group,
        capabilities: {
          ...group.capabilities,
          member: {
            ...group.capabilities?.member,
            add: [...memberAdd, 'core-posts-read'],
          },
        },
      };
    }),
};
