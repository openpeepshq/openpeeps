import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';
import { GroupData } from '@openpeeps/common/types';
import { groupCapabilityTemplates } from '@openpeeps/common/lib';

export default {
  key: '01989922-a9a0-7aae-8b9e-6416ed9c67b7',
  info: 'Update group capabilities',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'groups', (doc) => {
      const oldGroup = doc as GroupData;
      const { discoverable, locked } = doc as {
        discoverable: boolean;
        locked: boolean;
      };

      const { publicGroup, privateGroup, lockedGroup } =
        groupCapabilityTemplates;

      const template = discoverable
        ? locked
          ? lockedGroup
          : publicGroup
        : privateGroup;

      return {
        ...oldGroup,
        capabilities: template.capabilities,
      };
    }),
};
