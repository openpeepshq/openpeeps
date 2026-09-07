import { createCache } from 'cache-manager';
import { allpeepDb } from '../db';
import { hub } from '../events';
import { logger } from '../log';
import { profileSettingsMapping } from './mapping';
import type { StoredProfileSettings } from '@openpeepshq/common/types';

const log = logger('core:profileSettings');

export const profileSettingsCache = createCache({
  ttl: 60 * 60 * 1000 * 24,
  refreshThreshold: 60 * 60 * 1000,
});

// Settings updates run in the API process; notification email delivery runs in
// the worker with its own in-memory cache. Invalidate across processes via Redis.
hub.on('profileSettingsUpdated', (profileId: string) => {
  void profileSettingsCache.del(profileId).catch((error: unknown) => {
    log.error(
      { error, profileId },
      'profile settings cache invalidation failed',
    );
  });
});

export const findStoredProfileSettings = async (
  id: string,
): Promise<StoredProfileSettings | undefined> => {
  const { db } = await allpeepDb();
  return profileSettingsMapping.findOneBy(db, {
    matches: { profileId: id } as unknown as Partial<StoredProfileSettings>,
  });
};

export const getProfileSettings = async (
  id: string,
): Promise<StoredProfileSettings> =>
  profileSettingsCache.wrap(id, async () => {
    const { db } = await allpeepDb();
    const foundSettings = await profileSettingsMapping.find(db, id);
    if (foundSettings) {
      return foundSettings;
    }
    return profileSettingsMapping.create(db, { id });
  });
