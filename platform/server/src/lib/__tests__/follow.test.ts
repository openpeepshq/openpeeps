import { beforeEach, describe, expect, it, vi } from 'vitest';
import { followProfileHandler } from '#lib/handlers/profile/follow';
import {
  canFollowProfile,
  follow,
  findProfile,
} from '@openpeepshq/core/profiles';
import { ensureLocalProfile } from '#lib/auth';
import type {
  AuthorizationData,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

// Unit-level test of the follow handler's capability gate (#310 review):
// the HTTP layer must pass the request's authData through to
// canFollowProfile, so a restricted token is rejected (403) where the
// core-layer tests' synthesized admin scope would pass. Deps are mocked;
// the handler itself runs unmocked.
vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  canFollowProfile: vi.fn(),
  findProfile: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
}));

const follower = { id: 'p1', handle: 'alice' } as ProfileWithMeta;
const target = { id: 'p2', handle: 'news' } as ProfileWithMeta;

const restrictedAuthData = {
  scopes: [{ scopeLevel: 'read', resource: { type: 'profiles' } }],
} as AuthorizationData;

const call = (authData: AuthorizationData | undefined) =>
  followProfileHandler({ profileId: target.id, reblogs: true, notify: false }, {
    context: { authData },
  } as never);

describe('followProfileHandler — authData pass-through to canFollowProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureLocalProfile).mockResolvedValue(follower);
    vi.mocked(findProfile).mockResolvedValue(target);
    vi.mocked(follow).mockResolvedValue(undefined);
  });

  it('passes the restricted authData through and rejects with 403', async () => {
    vi.mocked(canFollowProfile).mockResolvedValue({
      success: false,
      missingCapabilities: ['core-profiles-follow'],
    });

    await expect(call(restrictedAuthData)).rejects.toMatchObject({
      status: 403,
    });
    // The gate saw the request's real token, not a synthesized admin scope.
    expect(canFollowProfile).toHaveBeenCalledWith(
      follower,
      target,
      restrictedAuthData,
    );
    expect(follow).not.toHaveBeenCalled();
  });

  it('allows the follow when the capability check passes and persists it', async () => {
    vi.mocked(canFollowProfile).mockResolvedValue({
      success: true,
      missingCapabilities: [],
    });

    const res = await call(restrictedAuthData);

    expect(res).toEqual({ success: true });
    expect(canFollowProfile).toHaveBeenCalledWith(
      follower,
      target,
      restrictedAuthData,
    );
    expect(follow).toHaveBeenCalledWith(follower, target, {
      reblogs: true,
      notify: false,
    });
  });
});
