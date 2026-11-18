import { afterEach, describe, expect, it } from 'vitest';
import { clearProfileCache, profilesCache, publicProfilesCache } from './cache';
import { isDeactivatedProfile } from '@openpeepshq/common/lib';

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

  it('evicts the handle and all: keys a delete/deactivate path leaves stale', async () => {
    await profilesCache.set(profile.handle, { cached: 'by-handle' });
    await publicProfilesCache.set(`all:${profile.id}`, { cached: 'all' });

    await clearProfileCache(profile);

    expect(await profilesCache.get(profile.handle)).toBeUndefined();
    expect(await publicProfilesCache.get(`all:${profile.id}`)).toBeUndefined();
  });

  it('getPublicProfile misses after the cache is cleared by a hard delete', async () => {
    await publicProfilesCache.set(profile.id, { cached: 'public' });

    await clearProfileCache(profile);

    expect(await publicProfilesCache.get(profile.id)).toBeUndefined();
  });
});

describe('isDeactivatedProfile', () => {
  it('is true for a soft-deleted row with deactivatedAt stamped on the body', () => {
    expect(
      isDeactivatedProfile({
        deletedAt: '2026-01-01T00:00:00Z',
        body: { deactivatedAt: '2026-01-01T00:00:00Z' },
      }),
    ).toBe(true);
  });

  it('is false without deactivatedAt, without a soft-delete stamp, or for null/undefined profiles', () => {
    expect(
      isDeactivatedProfile({ body: { deactivatedAt: '2026-01-01T00:00:00Z' } }),
    ).toBe(false);
    expect(
      isDeactivatedProfile({ deletedAt: '2026-01-01T00:00:00Z', body: {} }),
    ).toBe(false);
    expect(isDeactivatedProfile({ body: null })).toBe(false);
    expect(isDeactivatedProfile({})).toBe(false);
    expect(isDeactivatedProfile(undefined)).toBe(false);
    expect(isDeactivatedProfile(null)).toBe(false);
  });
});
