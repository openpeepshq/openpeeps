import { createCache } from 'cache-manager';
import { allpeepDb } from '../db';
import { hub } from '../events';
import { profileSettingsMapping } from './mapping';

export const profileSettingsCache = createCache({
  ttl: 60 * 60 * 1000 * 24,
  refreshThreshold: 60 * 60 * 1000,
});

// Settings updates run in the API process; notification email delivery runs in
// the worker with its own in-memory cache. Invalidate across processes via Redis.
hub.on('profileSettingsUpdated', (profileId: string) => {
  void profileSettingsCache.del(profileId);
});

export const getProfileSettings = async (id: string) =>
  profileSettingsCache.wrap(id, async () => {
    const { db } = await allpeepDb();
    const foundSettings = await profileSettingsMapping.find(db, id);
    if (foundSettings) {
      return foundSettings;
    }
    const newSettings = await profileSettingsMapping.create(db, {
      id,
    });
    return newSettings;
  });
