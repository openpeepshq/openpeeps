import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';
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
