import { Database } from 'arangojs';
import { GroupData } from '@openpeepshq/common/types';
import { transformDocsInCollection } from '../helpers';

const capabilitiesToAdd = [
  'core-posts-reply',
  'core-posts-rsvp',
  'core-posts-vote',
];

export default {
  key: '019c98bd-56bf-7326-a4ea-45fd4fcd2309',
  info: 'Add reply, RSVP, and vote post capabilities for group members',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'groups', (doc) => {
      const oldGroup = doc as GroupData;
      const currentMemberAddCapabilities =
        oldGroup.capabilities?.member?.add ?? [];

      return {
        ...oldGroup,
        capabilities: {
          ...oldGroup.capabilities,
          member: {
            ...oldGroup.capabilities?.member,
            add: Array.from(
              new Set([...currentMemberAddCapabilities, ...capabilitiesToAdd]),
            ),
          },
        },
      };
    }),
};
