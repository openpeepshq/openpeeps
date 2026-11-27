import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  followParamsSchema,
  followProfileHandler,
  unfollowProfileHandler,
} from '#lib/handlers/profile/follow';
import {
  canFollowProfile,
  follow,
  findProfile,
  unfollow,
} from '@openpeepshq/core/profiles';
import { resolveRemoteAccount } from '@openpeepshq/core/federation';
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
vi.mock('@openpeepshq/core/federation', () => ({
  resolveRemoteAccount: vi.fn(),
}));

const follower = { id: 'p1', handle: 'alice' } as ProfileWithMeta;
const target = { id: 'p2', handle: 'news' } as ProfileWithMeta;
const remoteTarget = {
  id: 'p9',
  handle: 'user',
  type: 'federated',
  uri: 'https://remote.example/users/user',
} as ProfileWithMeta;

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

describe('followProfileHandler — follow by remote handle (#241)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureLocalProfile).mockResolvedValue(follower);
    vi.mocked(findProfile).mockResolvedValue(undefined);
    vi.mocked(canFollowProfile).mockResolvedValue({
      success: true,
      missingCapabilities: [],
    });
    vi.mocked(follow).mockResolvedValue(undefined);
  });

  it('404s when no profileId resolves and no handle is given', async () => {
    vi.mocked(resolveRemoteAccount).mockResolvedValue(undefined);

    await expect(
      followProfileHandler({ profileId: 'ghost' }, { context: {} } as never),
    ).rejects.toMatchObject({ status: 404 });
    expect(resolveRemoteAccount).not.toHaveBeenCalled();
    expect(follow).not.toHaveBeenCalled();
  });

  it('404s when the handle cannot be resolved', async () => {
    vi.mocked(resolveRemoteAccount).mockResolvedValue(undefined);

    await expect(
      followProfileHandler({ handle: 'nobody@denied.example' }, {
        context: {},
      } as never),
    ).rejects.toMatchObject({ status: 404 });
    expect(resolveRemoteAccount).toHaveBeenCalledWith('nobody@denied.example');
    expect(follow).not.toHaveBeenCalled();
  });

  it('resolves the remote handle, capability-checks it, and follows', async () => {
    vi.mocked(resolveRemoteAccount).mockResolvedValue(remoteTarget);

    const res = await followProfileHandler(
      { handle: 'user@remote.example', reblogs: true },
      { context: { authData: restrictedAuthData } } as never,
    );

    expect(res).toEqual({ success: true });
    expect(resolveRemoteAccount).toHaveBeenCalledWith('user@remote.example');
    expect(canFollowProfile).toHaveBeenCalledWith(
      follower,
      remoteTarget,
      restrictedAuthData,
    );
    expect(follow).toHaveBeenCalledWith(follower, remoteTarget, {
      handle: 'user@remote.example',
      reblogs: true,
    });
  });

  it('prefers a resolvable profileId over the handle', async () => {
    vi.mocked(findProfile).mockResolvedValue(target);

    await followProfileHandler(
      { profileId: target.id, handle: 'user@remote.example' },
      { context: {} } as never,
    );

    expect(resolveRemoteAccount).not.toHaveBeenCalled();
    expect(follow).toHaveBeenCalledWith(follower, target, {
      handle: 'user@remote.example',
    });
  });
});

describe('unfollowProfileHandler (#241)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureLocalProfile).mockResolvedValue(follower);
    vi.mocked(findProfile).mockResolvedValue(target);
    vi.mocked(unfollow).mockResolvedValue(undefined);
  });

  it('resolves and unfollows the given profile', async () => {
    await expect(
      unfollowProfileHandler({ profileId: target.id }, {
        context: {},
      } as never),
    ).resolves.toEqual({ success: true });
    expect(unfollow).toHaveBeenCalledWith(follower, target);
  });

  it('keeps profileId required on the path route schema (review #4)', () => {
    // The follow-by-handle route has no path parameters at all, so the
    // shared handler's optional-profileId input must not leak into the
    // path route's OpenAPI: its `Param` schema stays required, which is
    // what rejects a missing profileId before the handler runs.
    expect(followParamsSchema.safeParse({}).success).toBe(false);
    expect(followParamsSchema.safeParse({ profileId: target.id }).success).toBe(
      true,
    );
  });
});
