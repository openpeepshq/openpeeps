import { ProfileSettingsData } from '@openpeepshq/common/types';
import { conflict } from '../errors';
import { allpeepDb } from '../db';
import { hub } from '../events';
import { profileSettingsMapping } from './mapping';
import { findProfileSettings } from './finders';
import { profileSettingsCache } from './cache';

export const createProfileSettings = (
  profileSettingsData: ProfileSettingsData,
) =>
  allpeepDb().then(async ({ db }) => {
    const existingConfig = await findProfileSettings(profileSettingsData.id);
    if (existingConfig) {
      throw conflict({
        errorKey: 'error.configExists',
        parameters: { key: profileSettingsData.id },
      });
    }
    return profileSettingsMapping.create(db, profileSettingsData);
  });

export const updateProfileSettings = async (
  id: string,
  profileSettingsData: Partial<ProfileSettingsData>,
) => {
  const { db } = await allpeepDb();
  await findProfileSettings(id);
  const updatedSettings = await profileSettingsMapping.update(
    db,
    id,
    profileSettingsData,
  );
  await profileSettingsCache.del(id);
  await hub.emit('profileSettingsUpdated', id);
  return updatedSettings;
};
