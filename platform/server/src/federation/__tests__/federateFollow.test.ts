import { describe, expect, it, vi } from 'vitest';

// Pins the blocklist gate wiring in `federateFollow`: it must consult
// `peerHostAllowed(followed.uri)` and, when the gate denies (allowlisted but
// blocklisted host), be a full no-op — no Fedify context, no outbound Follow.
// The gate's internal allow/block composition is covered in peers.test.ts;
// this test only asserts federateFollow honours the gate's verdict, so the
// early-return can't be dropped in a later refactor.
const peerHostAllowedMock = vi.hoisted(() => vi.fn(async () => true));

vi.mock('@openpeepshq/core/federation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openpeepshq/core/federation')>()),
  peerHostAllowed: peerHostAllowedMock,
}));

import type { Federation } from '@fedify/fedify';
import type { Profile, ProfileWithMeta } from '@openpeepshq/common/types';
import { federateFollow } from '../fedify';

const follower = {
  id: 'local-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  type: 'local',
} as unknown as Profile;

const followedProfile = (): ProfileWithMeta =>
  ({
    ...follower,
    type: 'federated',
    uri: 'https://allowed.example/@remote',
    inboxUrl: 'https://allowed.example/inbox',
    roles: [],
    followers: [],
    following: [],
    controllers: [],
    memberships: [],
    profileStats: {},
    blockingIds: [],
    blockedByIds: [],
    followedHashtags: [],
  }) as unknown as ProfileWithMeta;

const makeFederation = () => {
  const sendActivity = vi.fn(
    async (
      _identifier: unknown,
      _target: unknown,
      _activity: unknown,
      _options: unknown,
    ) => undefined,
  );
  const federation = {
    createContext: vi.fn(() => ({
      sendActivity,
      getActorUri: (id: string) => new URL(`http://origin/ap/actor/${id}`),
    })),
    sendActivity,
  } as unknown as Federation<void> & { sendActivity: typeof sendActivity };
  return federation;
};

describe('federateFollow blocklist gate', () => {
  it('is a full no-op when the gate denies the host (allowlisted but blocklisted)', async () => {
    peerHostAllowedMock.mockResolvedValueOnce(false);
    const federation = makeFederation();
    await federateFollow(
      federation,
      'http://origin',
      follower,
      followedProfile(),
    );
    expect(peerHostAllowedMock).toHaveBeenCalledWith(
      'https://allowed.example/@remote',
    );
    expect(federation.createContext).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
  });

  it('still sends a Follow when the gate allows the host', async () => {
    peerHostAllowedMock.mockResolvedValueOnce(true);
    const federation = makeFederation();
    await federateFollow(
      federation,
      'http://origin',
      follower,
      followedProfile(),
    );
    expect(peerHostAllowedMock).toHaveBeenCalledWith(
      'https://allowed.example/@remote',
    );
    expect(federation.sendActivity).toHaveBeenCalledTimes(1);
    const [identifier, target, , opts] = federation.sendActivity.mock.calls[0];
    expect(identifier).toEqual({ identifier: 'local-1' });
    const t = target as { id: URL; inboxId: URL };
    expect(t.id.href).toBe('https://allowed.example/@remote');
    expect(t.inboxId.href).toBe('https://allowed.example/inbox');
    expect(opts).toEqual({ preferSharedInbox: true });
  });
});
