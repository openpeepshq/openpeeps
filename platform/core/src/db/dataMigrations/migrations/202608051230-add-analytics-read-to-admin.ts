import { Database } from 'arangojs';
import { RoleData } from '@openpeeps/common/types';
import { transformDocsInCollection } from '../helpers';

const ADMIN_ANALYTICS_CAPABILITY = 'core-analytics-read';

export default {
  key: '019fd17f-2fde-7c97-87e5-ff657580d1b7',
  info: 'Add core-analytics-read to the admin role',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'roles', (doc) => {
      const role = doc as RoleData;
      if (role.key !== 'admin') {
        return role;
      }

      const add = role.capabilities?.add ?? [];
      if (add.includes(ADMIN_ANALYTICS_CAPABILITY)) {
        return role;
      }

      return {
        ...role,
        capabilities: {
          ...role.capabilities,
          add: [...add, ADMIN_ANALYTICS_CAPABILITY],
        },
      };
    }),
};
