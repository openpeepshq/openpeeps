import { Database } from 'arangojs';
import { RoleData } from '@openpeeps/common/types';
import { transformDocsInCollection } from '../helpers';

// Backup capabilities were stored with the singular prefix `core-backup-`
// (e.g. `core-backup-*`, `core-backup-restore`) while the API enforces the
// plural `core-backups-` form. Rewrite stored role capabilities to the plural
// spelling so existing roles keep working.
const renameBackupCapability = (capability: string): string =>
  capability.startsWith('core-backup-')
    ? capability.replace(/^core-backup-/, 'core-backups-')
    : capability;

const renameInList = (capabilities?: string[]): string[] =>
  (capabilities ?? []).map(renameBackupCapability);

export default {
  key: '019e970d-02e0-786a-80d3-c01a677b1a53',
  info: 'Rename core-backup-* role capabilities to plural core-backups-*',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'roles', (doc) => {
      const role = doc as RoleData;
      return {
        ...role,
        capabilities: {
          add: renameInList(role.capabilities?.add),
          remove: renameInList(role.capabilities?.remove),
        },
      };
    }),
};
