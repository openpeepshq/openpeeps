import { Database } from 'arangojs';
import { Profile } from '@openpeepshq/common/types';
import { transformDocsInCollection } from '../helpers';

const LEGACY_RESOURCE_TYPE_MAP: Record<string, string> = {
  jam: 'jams',
  profile: 'profiles',
};

const normalizeResourceType = (type: string): string =>
  LEGACY_RESOURCE_TYPE_MAP[type] ?? type;

export default {
  key: '019637a0-1200-7000-8000-resource-type-legacy',
  info: 'Migrate legacy resource types (jam → jams, profile → profiles)',
  migration: (db: Database) =>
    transformDocsInCollection(db, 'profiles', (doc) => {
      const profile = doc as Profile;
      const resource = profile.guestData?.resource;
      if (!resource?.type) {
        return profile;
      }

      const type = normalizeResourceType(resource.type);
      if (type === resource.type) {
        return profile;
      }

      return {
        ...profile,
        guestData: {
          ...profile.guestData,
          resource: { ...resource, type },
        },
      };
    }),
};
