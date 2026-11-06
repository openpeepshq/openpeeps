import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta, PublicProfile } from '@openpeepshq/common/types';
import {
  isProfileOnline,
  markProfileSeen,
  withPresenceForViewer,
} from '#lib/presence';

const fakeRedis = vi.hoisted(() => ({
  set: vi.fn(async () => 'OK'),
  exists: vi.fn(async () => 1),
}));

vi.mock('@openpeepshq/core/redis', () => ({
  getSharedConnection: async () => fakeRedis,
}));

const role = (add: string[] = []): ProfileWithMeta['roles'][number] =>
  // checkRoleCapabilities only reads capabilities; the rest of the model is
  // irrelevant to these tests.
  ({
    capabilities: { add, remove: [] },
  }) as unknown as ProfileWithMeta['roles'][number];

const profile = (
  id: string,
  roles: ProfileWithMeta['roles'],
): ProfileWithMeta => ({ id, roles }) as ProfileWithMeta;

const STAFF = profile('staff-1', [role(['core-presence-read'])]);
const MEMBER = profile('member-1', [role(['core-local'])]);

const publicProfile = (id: string): PublicProfile =>
  ({ id, handle: id, displayName: id }) as PublicProfile;

describe('withPresenceForViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeRedis.exists.mockResolvedValue(1);
  });

  it('returns the profile unchanged when there is no viewer', async () => {
    const base = publicProfile('t1');
    const result = await withPresenceForViewer(undefined, STAFF, base);
    expect(result).toBe(base);
  });

  it('returns the profile unchanged for the profile itself', async () => {
    const base = publicProfile('staff-1');
    const result = await withPresenceForViewer(STAFF, STAFF, base);
    expect(result).toBe(base);
  });

  it('returns the profile unchanged for a viewer without core-presence-read', async () => {
    const base = publicProfile('t1');
    const result = await withPresenceForViewer(MEMBER, STAFF, base);
    expect(result).toBe(base);
  });

  it('returns the profile unchanged for a target without core-presence-read', async () => {
    const base = publicProfile('member-1');
    const result = await withPresenceForViewer(STAFF, MEMBER, base);
    expect(result).toBe(base);
  });

  it('treats the owner wildcard as staff', async () => {
    const owner = profile('owner-1', [role(['*'])]);
    const target = profile('staff-2', [role(['core-presence-read'])]);
    const result = await withPresenceForViewer(
      owner,
      target,
      publicProfile('staff-2'),
    );
    expect(result).toEqual({
      id: 'staff-2',
      handle: 'staff-2',
      displayName: 'staff-2',
      online: true,
    });
  });

  it('reports online while the presence key exists (within the window)', async () => {
    fakeRedis.exists.mockResolvedValue(1);
    const target = profile('staff-2', [role(['core-presence-read'])]);
    const base = publicProfile('staff-2');
    const result = await withPresenceForViewer(STAFF, target, base);
    expect(result).toEqual({ ...base, online: true });
  });

  it('reports offline once the presence key has expired (outside the window)', async () => {
    fakeRedis.exists.mockResolvedValue(0);
    const target = profile('staff-2', [role(['core-presence-read'])]);
    const base = publicProfile('staff-2');
    const result = await withPresenceForViewer(STAFF, target, base);
    expect(result).toEqual({ ...base, online: false });
  });
});

describe('presence storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a profile seen with a 120s TTL', async () => {
    await markProfileSeen('p1');
    expect(fakeRedis.set).toHaveBeenCalledWith('presence:p1', '1', {
      EX: 120,
    });
  });

  it('isProfileOnline reads the presence key', async () => {
    fakeRedis.exists.mockResolvedValue(1);
    await expect(isProfileOnline('p1')).resolves.toBe(true);
    expect(fakeRedis.exists).toHaveBeenCalledWith('presence:p1');
  });

  it('treats a down Redis as offline without throwing', async () => {
    fakeRedis.exists.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(isProfileOnline('p1')).resolves.toBe(false);
  });

  it('swallows Redis failures on heartbeat so callers never see errors', async () => {
    fakeRedis.set.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(markProfileSeen('p1')).resolves.toBeUndefined();
  });
});
