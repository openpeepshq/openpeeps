import { Database } from 'arangojs';
import { RoleData } from '@openpeeps/common/types';
import { transformDocsInCollection } from '../helpers';

// Grant moderators the read capabilities required for the admin sections they
// should access (members, groups, invites, moderation, analytics). Existing
// moderator roles in the DB are updated; other roles are left untouched.
const MODERATOR_ADMIN_READ_CAPABILITIES = [
  'core-accounts-read',
  'core-profiles-read',
  'core-groups-read',
  'core-inviteLinks-read',
  'core-reports-read',
  'core-analytics-read',
] as const;

export default {
  key: '019e971b-d967-7443-83a1-1fd8b357b80f',
  info: 'Add admin read capabilities to the moderator role',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'roles', (doc) => {
      const role = doc as RoleData;
      if (role.key !== 'moderator') {
        return role;
      }

      const add = role.capabilities?.add ?? [];
      const toAdd = MODERATOR_ADMIN_READ_CAPABILITIES.filter((c) => !add.includes(c));
      if (toAdd.length === 0) {
        return role;
      }

      return {
        ...role,
        capabilities: {
          ...role.capabilities,
          add: [...add, ...toAdd],
        },
      };
    }),
};
