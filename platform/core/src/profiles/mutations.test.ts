import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

vi.mock('./mapping', () => ({ profilesMapping: {} }));
vi.mock('../db', () => ({ allpeepDb: vi.fn(async () => ({ db: {} })) }));
vi.mock('./helpers', () => ({
  followConnector: vi.fn(),
  followDisconnector: vi.fn(),
  followFinder: vi.fn(),
  giveControl: vi.fn(),
  roleAssigner: vi.fn(),
  roleUnassigner: vi.fn(),
}));
vi.mock('../events', () => ({ hub: { emit: vi.fn() } }));
vi.mock('../accessTokens/helpers', () => ({
  deleteAccessTokensForProfile: vi.fn(),
}));
vi.mock('./cache', () => ({
  profilesCache: {},
  getProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  clearProfileCache: vi.fn(),
  getProfileByHandle: vi.fn(),
}));
vi.mock('../accounts/cache', () => ({ accountsCache: {} }));
vi.mock('./capacity', () => ({ assertProfileCapacity: vi.fn() }));
vi.mock('./blocks', () => ({
  deleteBlock: vi.fn(),
  dropFollowsBetween: vi.fn(),
  insertBlock: vi.fn(),
  listBlockingIds: vi.fn(),
}));
vi.mock('../federation/identity', () => ({ localActorScalars: vi.fn() }));

import { followConnector, followFinder } from './helpers';
import { getProfileByHandle } from './cache';
import { followDesignatedProfiles } from './mutations';

const db = {};

const member = { id: 'p1', handle: 'member' } as ProfileWithMeta;
const news = { id: 'p2', handle: 'news' } as ProfileWithMeta;

describe('followDesignatedProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('follows resolvable designated handles and skips the rest', async () => {
    vi.mocked(getProfileByHandle).mockImplementation(async (handle: string) =>
      handle === 'news' ? news : undefined,
    );

    await followDesignatedProfiles(member, ['@news', 'missing', 'member']);

    expect(getProfileByHandle).toHaveBeenCalledWith('news');
    // Own handle is skipped without a lookup.
    expect(getProfileByHandle).not.toHaveBeenCalledWith('member');
    expect(followConnector).toHaveBeenCalledTimes(1);
    expect(followConnector).toHaveBeenCalledWith(db, member, news, {
      reblogs: true,
      notify: false,
    });
  });

  it('does not follow when a follow already exists', async () => {
    vi.mocked(getProfileByHandle).mockResolvedValue(news);
    vi.mocked(followFinder).mockResolvedValue({ id: 'f1' });

    await followDesignatedProfiles(member, ['news']);

    expect(followConnector).not.toHaveBeenCalled();
  });
});
