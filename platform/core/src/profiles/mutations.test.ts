import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthorizationData,
  CapabilitiesConfig,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

vi.mock('./mapping', () => ({
  profilesMapping: {
    delete: vi.fn(async () => undefined),
    deleteRelations: vi.fn(async () => undefined),
  },
}));
vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({ db: {} })),
  collectionInfos: {
    profilesCollection: {},
    followsCollection: {},
  },
}));
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
  communityConfigFresh: vi.fn(),
  config: vi.fn(),
}));
vi.mock('../accessTokens/helpers', () => ({
  deleteAccessTokensForProfile: vi.fn(),
}));
vi.mock('../calendarFeedTokens', () => ({
  revokeAllCalendarFeedTokens: vi.fn(async () => 0),
}));
vi.mock('./cache', () => ({
  profilesCache: { del: vi.fn(async () => undefined) },
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

import { followConnector, followDisconnector, followFinder } from './helpers';
import {
  clearProfileCache,
  getLocalProfileByHandle,
  getProfile,
  profilesCache,
} from './cache';
import { hub } from '../events';
import {
  capabilitiesConfig,
  communityConfig,
  communityConfigFresh,
  config,
} from '../config';
import {
  canFollowProfile,
  deleteProfile,
  followDesignatedProfiles,
  normalizeAutoFollowHandle,
  unfollow,
} from './mutations';
import { registerAutoFollowHandler } from './autoFollow';
import { profilesMapping } from './mapping';
import { deleteAccessTokensForProfile } from '../accessTokens/helpers';
import { revokeAllCalendarFeedTokens } from '../calendarFeedTokens';

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

  it('skips handles that normalize to empty (no lookup, no follow)', async () => {
    await followDesignatedProfiles(member, ['@', '   ']);

    expect(getLocalProfileByHandle).not.toHaveBeenCalled();
    expect(followConnector).not.toHaveBeenCalled();
  });

  it('pins the handle list it is given; never re-reads community config itself', async () => {
    // Layering guard: followDesignatedProfiles is the pure "follow these
    // handles" step. The fresh community-config read (#310) lives one layer
    // up in the profileCreated handler. This pins that the function takes the
    // handle list as given and its only config read is the capabilities check,
    // so a future internal community-config re-read — via any of the exported
    // accessors (fresh, cached, or the generic config()) — is a visible
    // regression rather than a silent behavior change.
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);

    await followDesignatedProfiles(member, ['news']);

    expect(getLocalProfileByHandle).toHaveBeenCalledWith('news');
    expect(capabilitiesConfig).toHaveBeenCalledTimes(1);
    expect(followConnector).toHaveBeenCalledTimes(1);
    // It never reads community config itself — fresh, cached, or via the
    // generic config() accessor.
    expect(communityConfigFresh).not.toHaveBeenCalled();
    expect(communityConfig).not.toHaveBeenCalled();
    expect(config).not.toHaveBeenCalled();
  });

  it('emits followCreated for each landed follow, so the AT projection hook fires for auto-followed designated profiles', async () => {
    // The AT projection (server install.ts) hooks only followCreated — the
    // same event interactive follows emit. This pins that the auto-follow
    // batch routes through follow() and lands the projected follow for
    // followable designated targets, so the "instance admin auto-follows a
    // peer" onboarding path is guarded from silent regression.
    vi.mocked(hub.emit).mockClear();
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);

    await followDesignatedProfiles(member, ['news']);

    expect(followConnector).toHaveBeenCalledTimes(1);
    expect(hub.emit).toHaveBeenCalledWith('followCreated', member, news);
  });

  it('emits no followCreated for targets the capability check skips, so nothing projects for them', async () => {
    // The capability check inside the batch skips non-followable targets
    // before follow() runs — the skip must stay silent: no follow, no
    // followCreated, no projected AT record for a follow that never existed.
    vi.mocked(capabilitiesConfig).mockResolvedValue({
      profile: {},
    } as unknown as CapabilitiesConfig);
    vi.mocked(hub.emit).mockClear();
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(news);

    await followDesignatedProfiles(member, ['news']);

    expect(followConnector).not.toHaveBeenCalled();
    expect(hub.emit).not.toHaveBeenCalledWith('followCreated', member, news);
  });
});

describe('canFollowProfile', () => {
  // `core-profiles-follow` requires an `admin` scope, so the pass/fail hinge
  // on the caller's scopes as much as on the capability config.
  it('passes the synthesized admin scope when authData is omitted', async () => {
    // allowFollowConfig (set in beforeEach) grants core-profiles-follow to none.
    const { success, missingCapabilities } = await canFollowProfile(
      member,
      news,
    );

    expect(success).toBe(true);
    expect(missingCapabilities).toEqual([]);
  });

  it('still passes with an explicit admin authData', async () => {
    const authData = {
      scopes: [{ scopeLevel: 'admin', resource: { type: '*', id: '*' } }],
    } as AuthorizationData;

    const { success } = await canFollowProfile(member, news, authData);

    expect(success).toBe(true);
  });

  it('fails a restricted-scope authData even when the config allows the relationship', async () => {
    // allowFollowConfig grants the relationship, but a read-only token scope
    // cannot satisfy the `admin` scope the follow capability requires.
    const authData = {
      scopes: [{ scopeLevel: 'read', resource: { type: 'profiles' } }],
    } as AuthorizationData;

    const { success } = await canFollowProfile(member, news, authData);

    expect(success).toBe(false);
  });

  it('fails when the config withholds the capability regardless of scopes', async () => {
    // Nothing grants core-profiles-follow; even a full admin token scope fails.
    vi.mocked(capabilitiesConfig).mockResolvedValue({
      profile: {},
    } as unknown as CapabilitiesConfig);
    const authData = {
      scopes: [{ scopeLevel: 'admin', resource: { type: '*', id: '*' } }],
    } as AuthorizationData;

    const { success } = await canFollowProfile(member, news, authData);

    expect(success).toBe(false);
  });
});

describe('normalizeAutoFollowHandle', () => {
  it('strips a leading @ and trims surrounding whitespace', () => {
    expect(normalizeAutoFollowHandle('@news')).toBe('news');
    expect(normalizeAutoFollowHandle('  news  ')).toBe('news');
    expect(normalizeAutoFollowHandle('@news  ')).toBe('news');
    expect(normalizeAutoFollowHandle('  @news')).toBe('@news');
    expect(normalizeAutoFollowHandle('@')).toBe('');
    expect(normalizeAutoFollowHandle('   ')).toBe('');
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
    vi.mocked(communityConfigFresh).mockResolvedValue({
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
    vi.mocked(communityConfigFresh).mockResolvedValue({ content: {} } as never);

    await handler!({ id: 'p1' });

    expect(getLocalProfileByHandle).not.toHaveBeenCalled();
    expect(followConnector).not.toHaveBeenCalled();
  });
});

// deleteProfile's observable behavior is the side-effect chain: access-token
// cleanup, calendar-feed-token revocation (the `calendar_feed_tokens` table
// has no FK to profiles, so nothing cascades — this test pins that the
// revocation exists and runs after the access-token cleanup), and the
// mapping delete. The fake profile carries no controls/follows so the
// cache-cleanup branches stay no-ops.
describe('deleteProfile', () => {
  beforeEach(() => {
    vi.mocked(profilesMapping.delete).mockClear();
    vi.mocked(profilesMapping.deleteRelations).mockClear();
    vi.mocked(deleteAccessTokensForProfile).mockClear();
    vi.mocked(revokeAllCalendarFeedTokens).mockClear();
    vi.mocked(profilesCache.del).mockClear();
    vi.mocked(getProfile).mockReset();
    vi.mocked(getProfile).mockResolvedValue({ id: 'profile-1' } as never);
  });

  it('revokes the calendar feed tokens after the access-token cleanup', async () => {
    await deleteProfile('profile-1');

    expect(deleteAccessTokensForProfile).toHaveBeenCalledTimes(1);
    expect(revokeAllCalendarFeedTokens).toHaveBeenCalledTimes(1);
    expect(revokeAllCalendarFeedTokens).toHaveBeenCalledWith('profile-1');
    // The feed-token rows would otherwise keep resolving until expiry:
    // revocation must run, and only after the access-token cleanup.
    expect(
      revokeAllCalendarFeedTokens.mock.invocationCallOrder[0],
    ).toBeGreaterThan(deleteAccessTokensForProfile.mock.invocationCallOrder[0]);
    expect(profilesMapping.delete).toHaveBeenCalledWith({}, 'profile-1');
  });
});

describe('unfollow', () => {
  it('emits followDeleted so federation can send Undo(Follow)', async () => {
    vi.mocked(followDisconnector).mockClear();
    vi.mocked(clearProfileCache).mockClear();
    vi.mocked(hub.emit).mockClear();

    await unfollow(member, news);

    expect(followDisconnector).toHaveBeenCalledWith(db, member, news);
    expect(hub.emit).toHaveBeenCalledWith('followDeleted', member, news);
    expect(clearProfileCache).toHaveBeenCalledWith(member);
    expect(clearProfileCache).toHaveBeenCalledWith(news);
  });
});
