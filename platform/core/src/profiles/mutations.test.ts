import { beforeEach, describe, expect, it, vi } from 'vitest';

// deleteProfile's observable behavior is the side-effect chain: access-token
// cleanup, calendar-feed-token revocation (the `calendar_feed_tokens` table
// has no FK to profiles, so nothing cascades — this test pins that the
// revocation exists and runs after the access-token cleanup), and the
// mapping delete. The fake profile carries no controls/follows so the
// cache-cleanup branches stay no-ops.
vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({ db: {} })),
  collectionInfos: {
    profilesCollection: {},
    followsCollection: {},
  },
}));
vi.mock('./mapping', () => ({
  profilesMapping: {
    delete: vi.fn(async () => undefined),
    deleteRelations: vi.fn(async () => undefined),
  },
}));
vi.mock('../accessTokens/helpers', () => ({
  deleteAccessTokensForProfile: vi.fn(async () => undefined),
}));
vi.mock('../calendarFeedTokens', () => ({
  revokeAllCalendarFeedTokens: vi.fn(async () => 0),
}));
vi.mock('./cache', () => ({
  profilesCache: { del: vi.fn(async () => undefined) },
  getProfile: vi.fn(async () => undefined),
  getPublicProfile: vi.fn(async () => undefined),
  clearProfileCache: vi.fn(async () => undefined),
}));
vi.mock('../accounts/cache', () => ({
  accountsCache: { del: vi.fn(async () => undefined) },
}));

import { deleteProfile } from './mutations';
import { profilesMapping } from './mapping';
import { deleteAccessTokensForProfile } from '../accessTokens/helpers';
import { revokeAllCalendarFeedTokens } from '../calendarFeedTokens';
import { getProfile, profilesCache } from './cache';

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
