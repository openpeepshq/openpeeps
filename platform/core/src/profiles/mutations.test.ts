import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CapabilitiesConfig,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

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
vi.mock('../events', () => ({ hub: { emit: vi.fn(), once: vi.fn() } }));
vi.mock('../config', () => ({
  capabilitiesConfig: vi.fn(),
  communityConfig: vi.fn(),
}));
vi.mock('../accessTokens/helpers', () => ({
  deleteAccessTokensForProfile: vi.fn(),
}));
vi.mock('./cache', () => ({
  profilesCache: {},
  getProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  clearProfileCache: vi.fn(),
  getLocalProfileByHandle: vi.fn(),
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
import { getLocalProfileByHandle, getProfile } from './cache';
import { hub } from '../events';
import { capabilitiesConfig, communityConfig } from '../config';
import { followDesignatedProfiles } from './mutations';
import { registerAutoFollowHandler } from './autoFollow';

const db = {};

const baseProfile = { roles: [], followers: [], following: [] };

const member = {
  ...baseProfile,
  id: 'p1',
  handle: 'member',
  blockingIds: [],
  blockedByIds: [],
} as ProfileWithMeta;
const news = {
  ...baseProfile,
  id: 'p2',
  handle: 'news',
  blockingIds: [],
  blockedByIds: [],
} as ProfileWithMeta;

// Grants core-profiles-follow to the 'none' relationship (roleless callers).
const allowFollowConfig = {
  profile: { none: { add: ['core-profiles-follow'] } },
};

beforeEach(() => {
  // clearAllMocks keeps persistent implementations (mockResolvedValue), so
  // re-pin the shared mocks to their defaults explicitly.
  vi.clearAllMocks();
  vi.mocked(capabilitiesConfig).mockResolvedValue(
    allowFollowConfig as unknown as CapabilitiesConfig,
  );
  vi.mocked(followFinder).mockResolvedValue(undefined);
});

describe('followDesignatedProfiles', () => {
  it('follows resolvable designated handles and skips the rest', async () => {
    vi.mocked(getLocalProfileByHandle).mockImplementation(async (handle) =>
      handle === 'news' ? news : undefined,
    );

    await followDesignatedProfiles(member, ['@news', 'missing', 'member']);

    expect(getLocalProfileByHandle).toHaveBeenCalledWith('news');
    // Own handle is skipped without a lookup.
    expect(getLocalProfileByHandle).not.toHaveBeenCalledWith('member');
    expect(followConnector).toHaveBeenCalledTimes(1);
    expect(followConnector).toHaveBeenCalledWith(db, member, news, {
      reblogs: true,
      notify: false,
    });
  });

  it('does not follow when a follow already exists', async () => {
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);
    vi.mocked(followFinder).mockResolvedValue({ id: 'f1' });

    await followDesignatedProfiles(member, ['news']);

    expect(followConnector).not.toHaveBeenCalled();
  });

  it('skips blocked pairs without throwing', async () => {
    const blocker = {
      ...member,
      blockingIds: ['p2'],
    } as ProfileWithMeta;
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);

    await expect(
      followDesignatedProfiles(blocker, ['news']),
    ).resolves.toBeUndefined();
    expect(followConnector).not.toHaveBeenCalled();
  });

  it('skips targets the follower may not follow', async () => {
    // Nothing grants core-profiles-follow.
    vi.mocked(capabilitiesConfig).mockResolvedValue({
      profile: {},
    } as unknown as CapabilitiesConfig);
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);

    await followDesignatedProfiles(member, ['news']);

    expect(followConnector).not.toHaveBeenCalled();
  });

  it('continues past a rejected follow', async () => {
    const other = {
      ...baseProfile,
      id: 'p3',
      handle: 'other',
      blockingIds: [],
      blockedByIds: [],
    } as ProfileWithMeta;
    vi.mocked(getLocalProfileByHandle).mockImplementation(async (handle) =>
      handle === 'news' ? news : handle === 'other' ? other : undefined,
    );
    vi.mocked(followConnector).mockRejectedValueOnce(new Error('boom'));

    await followDesignatedProfiles(member, ['news', 'other']);

    expect(followConnector).toHaveBeenCalledTimes(2);
  });
});

describe('registerAutoFollowHandler', () => {
  // Registration is once-per-process, so the handler is captured in the
  // first test and reused by the second.
  let handler: ((...args: unknown[]) => unknown) | undefined;

  it('follows the configured handles for a newly created profile', async () => {
    vi.mocked(hub.once).mockImplementation((_event, h) => {
      handler = h;
    });
    registerAutoFollowHandler();
    expect(hub.once).toHaveBeenCalledWith(
      'profileCreated',
      expect.any(Function),
    );
    vi.mocked(getProfile).mockResolvedValue(member);
    vi.mocked(communityConfig).mockResolvedValue({
      content: { autoFollow: ['news'] },
    } as never);
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);

    await handler!({ id: 'p1' });

    expect(followConnector).toHaveBeenCalledTimes(1);
    expect(followConnector).toHaveBeenCalledWith(db, member, news, {
      reblogs: true,
      notify: false,
    });
  });

  it('does nothing when no handles are configured', async () => {
    vi.mocked(getProfile).mockResolvedValue(member);
    vi.mocked(communityConfig).mockResolvedValue({ content: {} } as never);

    await handler!({ id: 'p1' });

    expect(getLocalProfileByHandle).not.toHaveBeenCalled();
    expect(followConnector).not.toHaveBeenCalled();
  });
});
