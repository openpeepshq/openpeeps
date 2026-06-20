import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';

export default {
  key: '019898f2-c539-7cfb-ba41-cf58f952dd62',
  info: 'Update group memeberships from capabilities to roles',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'userGroups', (doc) => {
      const oldMembership = doc as { capabilities?: string[] };
      return {
        ...oldMembership,
        capabilities: null,
        roles: oldMembership.capabilities?.includes('*')
          ? ['member', 'admin']
          : ['member'],
      };
    }),
};
