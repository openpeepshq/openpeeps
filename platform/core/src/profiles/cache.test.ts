import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { isDeactivatedProfile } from '@openpeepshq/common/lib';
import {
  clearProfileCache,
  getLocalProfileByHandle,
  profilesCache,
  publicProfilesCache,
} from './cache';
import { config } from '../config';
import { loadBlockIds } from './blocks';
import { profilesMapping } from './mapping';

vi.mock('../db', () => ({ allpeepDb: vi.fn(async () => ({ db: {} })) }));
vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('./mapping', () => ({
  profilesMapping: {
    findOneBy: vi.fn(),
    find: vi.fn(),
  },
  publicProfilesMapping: { findOneBy: vi.fn(), find: vi.fn() },
}));
vi.mock('./blocks', () => ({
  loadBlockIds: vi.fn(async () => ({ blockingIds: [], blockedByIds: [] })),
}));

const profile = { id: 'profile-1', handle: 'alice' };

afterEach(async () => {
  await profilesCache.clear();
  await publicProfilesCache.clear();
  vi.clearAllMocks();
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
  it('is true for a hydrated (flat) soft-deleted model with deactivatedAt top-level', () => {
    // rowToModel spreads the body jsonb into the model, so the real shape is flat.
    expect(
      isDeactivatedProfile({
        deletedAt: '2026-01-01T00:00:00Z',
        deactivatedAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe(true);
  });

  it('is true for a raw DB row with deactivatedAt stamped on the body', () => {
    expect(
      isDeactivatedProfile({
        deletedAt: '2026-01-01T00:00:00Z',
        body: { deactivatedAt: '2026-01-01T00:00:00Z' },
      }),
    ).toBe(true);
  });

  it('is false without deactivatedAt, without a soft-delete stamp, or for null/undefined profiles', () => {
    expect(
      isDeactivatedProfile({ deactivatedAt: '2026-01-01T00:00:00Z' }),
    ).toBe(false);
    expect(isDeactivatedProfile({ deletedAt: '2026-01-01T00:00:00Z' })).toBe(
      false,
    );
    expect(isDeactivatedProfile(undefined)).toBe(false);
    expect(isDeactivatedProfile(null)).toBe(false);
  });
});

describe('getLocalProfileByHandle', () => {
  const local = {
    id: 'profile-1',
    handle: 'alice',
    roles: [],
    followers: [],
    following: [],
  } as ProfileWithMeta;

  const stubConfig = (domain: string) =>
    vi.mocked(config).mockResolvedValue({
      activityPub: { defaultDomain: domain },
    } as never);

  it('resolves a handle against the instance default domain', async () => {
    stubConfig('openpeeps.local');
    const found = vi.mocked(profilesMapping.findOneBy);
    found.mockResolvedValue(local);

    await expect(getLocalProfileByHandle('alice')).resolves.toMatchObject({
      id: 'profile-1',
      blockingIds: [],
      blockedByIds: [],
    });
    expect(found).toHaveBeenCalledWith(
      {},
      {
        matches: {
          handle: 'alice',
          type: 'local',
          activityPub: { domain: 'openpeeps.local' },
        },
      },
    );
  });

  it('does not match a handle on a different domain', async () => {
    stubConfig('openpeeps.local');
    const found = vi.mocked(profilesMapping.findOneBy);
    found.mockResolvedValue(undefined);

    await expect(
      getLocalProfileByHandle('alice@elsewhere.social'),
    ).resolves.toBeUndefined();
    expect(found).toHaveBeenCalledWith(
      {},
      {
        matches: {
          handle: 'alice@elsewhere.social',
          type: 'local',
          activityPub: { domain: 'openpeeps.local' },
        },
      },
    );
  });

  it('returns undefined for an unknown handle', async () => {
    stubConfig('openpeeps.local');
    vi.mocked(profilesMapping.findOneBy).mockResolvedValue(undefined);

    await expect(getLocalProfileByHandle('ghost')).resolves.toBeUndefined();
    expect(loadBlockIds).not.toHaveBeenCalled();
  });
});
