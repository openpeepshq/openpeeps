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

const uniqueViolation = (error: unknown) => {
  const current = error as { code?: string; cause?: { code?: string } };
  return current.code === '23505' || current.cause?.code === '23505';
};

const readProfileSettings = async (
  db: Awaited<ReturnType<typeof allpeepDb>>['db'],
  id: string,
) =>
  // Include soft-deleted rows: the profile_id unique index still covers them,
  // so a miss here would insert and fail with 23505.
  profileSettingsMapping.find(db, id, { ignoreSoftDelete: true });

export const getProfileSettings = async (id: string) =>
  profileSettingsCache.wrap(id, async () => {
    const { db } = await allpeepDb();
    const foundSettings = await readProfileSettings(db, id);
    if (foundSettings) {
      return foundSettings;
    }
    try {
      return await profileSettingsMapping.create(db, { id });
    } catch (error) {
      // Another request created the row between the read and this insert.
      if (!uniqueViolation(error)) throw error;
      const raced = await readProfileSettings(db, id);
      if (raced) return raced;
      throw error;
    }
  });
