import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';
import { Profile } from '@openpeepshq/common/types';

export default {
  key: '01988a61-aa54-7b47-abc8-f0e63bf5fdd6',
  info: 'Setting profiles without type to "local"',
  migration: (db: Database) =>
    transformDocsInCollection(db, 'profiles', (doc) => {
      const oldProfile = doc as Profile;
      return {
        ...oldProfile,
        type: oldProfile.type || 'local',
      };
    }),
};
