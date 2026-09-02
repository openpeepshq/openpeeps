import { afterEach, describe, expect, it } from 'vitest';
import { clearProfileCache, profilesCache, publicProfilesCache } from './cache';

const profile = { id: 'profile-1', handle: 'alice' };

afterEach(async () => {
  await profilesCache.clear();
  await publicProfilesCache.clear();
});

describe('clearProfileCache', () => {
  it('drops id and handle keys from the profiles cache', async () => {
    await profilesCache.set(profile.id, { cached: 'by-id' });
    await profilesCache.set(profile.handle, { cached: 'by-handle' });

    await clearProfileCache(profile);

    expect(await profilesCache.get(profile.id)).toBeUndefined();
    expect(await profilesCache.get(profile.handle)).toBeUndefined();
  });

  it('drops public profile cache entries', async () => {
    await publicProfilesCache.set(profile.id, { cached: 'public' });
    await publicProfilesCache.set(`all:${profile.id}`, { cached: 'all' });

    await clearProfileCache(profile);

    expect(await publicProfilesCache.get(profile.id)).toBeUndefined();
    expect(await publicProfilesCache.get(`all:${profile.id}`)).toBeUndefined();
  });
});
