import { ProfileSettingsData } from '@openpeepshq/common/types';
import { map } from '../db/pg/map';
import { collectionInfos } from '../db';
import { ProfileSettings } from '@openpeepshq/common/types';

export const profileSettingsMapping = map<ProfileSettingsData, ProfileSettings>(
  {
    collection: collectionInfos.profileSettingsCollection.name,
  },
);
