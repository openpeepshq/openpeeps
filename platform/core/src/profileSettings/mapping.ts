import type {
  ProfileSettings,
  ProfileSettingsData,
  StoredProfileSettings,
} from '@openpeepshq/common/types';
import { map } from '../db/pg/map';
import { collectionInfos } from '../db';

export const profileSettingsMapping = map<
  ProfileSettingsData,
  StoredProfileSettings
>({
  collection: collectionInfos.profileSettingsCollection.name,
});

export const toPublicProfileSettings = (
  settings: StoredProfileSettings,
): ProfileSettings => {
  const publicSettings = { ...settings };
  delete publicSettings.pluginSettings;
  return publicSettings;
};
