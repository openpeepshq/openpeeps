import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

// Unit tests for outbound federation (#241): federateFollow must record the
// Follow activity in ap_activities BEFORE sending, and — because the ledger
// row is deleted when the follow edge goes away — a row found for a
// (re-)created edge is stale and must be cleared and re-sent (re-follow
// deadlock, review #1). federateUnfollow must only send Undo(Follow) for
// pairs that have a recorded outbound Follow, and delete the row afterwards.
//
// The core-federation mock is declared with hoisted typed functions (the
// `vi.mocked(…)` form can't infer a type from a bare `vi.mock` factory, so
// assertions on the mock would not compile — same pattern as
// federateFollow.test.ts).
const {
  findOutboundFollowMock,
  peerHostAllowedMock,
  recordApActivityMock,
  deleteOutboundFollowMock,
} = vi.hoisted(() => ({
  findOutboundFollowMock: vi.fn(async (..._args: unknown[]) => undefined),
  peerHostAllowedMock: vi.fn(async (..._args: unknown[]) => true),
  recordApActivityMock: vi.fn(async (..._args: unknown[]) => undefined),
  deleteOutboundFollowMock: vi.fn(async (..._args: unknown[]) => undefined),
}));

vi.mock('@fedify/fedify', () => ({
  createFederation: vi.fn(),
  PUBLIC_COLLECTION: 'Public',
}));
vi.mock('@fedify/fedify/vocab', () => {
  // Fedify vocab classes are constructed with `new`; returning the props
  // object makes `undo`/`follow` the same object our assertions inspect.
  const Activity = function Activity(props: unknown) {
    return props;
  };
  return {
    Accept: Activity,
    Create: Activity,
    Endpoints: Activity,
    Follow: Activity,
    Image: Activity,
    Note: Activity,
    Person: Activity,
    Tombstone: Activity,
    Undo: Activity,
  };
});
vi.mock('@fedify/postgres', () => ({
  PostgresKvStore: vi.fn(),
  PostgresMessageQueue: vi.fn(),
}));
vi.mock('@openpeepshq/core/config', () => ({
  config: vi.fn(),
}));
vi.mock('@openpeepshq/core/federation', () => ({
  ACTOR_PATH: '/ap/users/{identifier}',
  deleteOutboundFollow: deleteOutboundFollowMock,
  findOutboundFollow: findOutboundFollowMock,
  peerHostAllowed: peerHostAllowedMock,
  recordApActivity: recordApActivityMock,
}));

const { federateFollow, federateUnfollow } = await import('./fedify');

const ORIGIN = 'https://openpeeps.local';
const FOLLOWER = {
  id: 'local-profile-1',
  type: 'local',
} as never;
const REMOTE = {
  id: 'remote-1',
  type: 'federated',
  uri: 'https://remote.example/users/user',
  inboxUrl: 'https://remote.example/inbox',
  sharedInboxUrl: 'https://remote.example/shared',
} as unknown as ProfileWithMeta;

const expectedActorUri = `${ORIGIN}/ap/users/local-profile-1`;
const recordedFollowUri = `${ORIGIN}/ap/objects/follow-activity-id`;

const stubFederation = () => {
  const sendActivity = vi.fn(async (..._args: unknown[]) => undefined);
  return {
    federation: {
      createContext: () => ({ sendActivity }),
    } as never,
    sendActivity,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  findOutboundFollowMock.mockResolvedValue(undefined);
  recordApActivityMock.mockResolvedValue(undefined);
  deleteOutboundFollowMock.mockResolvedValue(undefined);
});

describe('federateFollow (#241 outbound)', () => {
  it('records the outbound Follow before sending', async () => {
    const { federation, sendActivity } = stubFederation();

    await federateFollow(federation, ORIGIN, FOLLOWER, REMOTE);

    expect(recordApActivityMock).toHaveBeenCalledTimes(1);
    expect(recordApActivityMock).toHaveBeenCalledWith({
      uri: expect.stringMatching(/^https:\/\/openpeeps\.local\/ap\/objects\//),
      type: 'Follow',
      actorUri: expectedActorUri,
      objectUri: REMOTE.uri,
      direction: 'out',
    });
    // Record first, send second — the Undo listener relies on the row
    // existing before the send can land.
    expect(recordApActivityMock.mock.invocationCallOrder[0]).toBeLessThan(
      sendActivity.mock.invocationCallOrder[0],
    );
    expect(sendActivity).toHaveBeenCalledTimes(1);
  });

  it('clears a stale outbound Follow row and re-sends (re-follow after the edge was dropped)', async () => {
    findOutboundFollowMock.mockResolvedValue({
      uri: recordedFollowUri,
      type: 'Follow',
      actorUri: expectedActorUri,
      objectUri: REMOTE.uri,
      direction: 'out',
    } as never);
    const { federation, sendActivity } = stubFederation();

    await federateFollow(federation, ORIGIN, FOLLOWER, REMOTE);

    expect(findOutboundFollowMock).toHaveBeenCalledWith(
      expectedActorUri,
      REMOTE.uri,
    );
    // The stale row is cleared …
    expect(deleteOutboundFollowMock).toHaveBeenCalledWith(
      expectedActorUri,
      REMOTE.uri,
    );
    // … a fresh Follow is recorded and sent — the remote host must learn
    // about the re-follow (review #1).
    expect(recordApActivityMock).toHaveBeenCalledTimes(1);
    expect(sendActivity).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for non-federated targets', async () => {
    const { federation, sendActivity } = stubFederation();

    await federateFollow(federation, ORIGIN, FOLLOWER, {
      id: 'local-2',
      type: 'local',
    } as never);

    expect(sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });
});

describe('federateUnfollow (#241 outbound Undo)', () => {
  it('sends Undo(Follow) referencing the recorded Follow, then records the Undo', async () => {
    findOutboundFollowMock.mockResolvedValue({
      uri: recordedFollowUri,
      type: 'Follow',
      actorUri: expectedActorUri,
      objectUri: REMOTE.uri,
      direction: 'out',
    } as never);
    const { federation, sendActivity } = stubFederation();

    await federateUnfollow(federation, ORIGIN, FOLLOWER, REMOTE);

    expect(sendActivity).toHaveBeenCalledTimes(1);
    // The last arg is the Undo activity. Its object must be the *embedded*
    // Follow (review #3), not a bare URI — remotes that dereference the
    // Undo's object (Mastodon does) get a 404 on a URI we cannot serve, so
    // the unfollow may be silently ignored.
    const undoArg = sendActivity.mock.calls[0][2] as {
      object: { id: URL; actor: URL; object: { id: URL } };
      actor: URL;
    };
    expect(undoArg.object.id.href).toBe(recordedFollowUri);
    expect(undoArg.object.actor.href).toBe(expectedActorUri);
    expect(undoArg.object.object.id.href).toBe(REMOTE.uri);
    expect(undoArg.actor.href).toBe(expectedActorUri);
    expect(recordApActivityMock).toHaveBeenCalledWith({
      uri: expect.stringMatching(/^https:\/\/openpeeps\.local\/ap\/objects\//),
      type: 'Undo',
      actorUri: expectedActorUri,
      objectUri: recordedFollowUri,
      direction: 'out',
    });
    // The ledger row is dropped with the edge so a re-follow re-sends
    // (review #1).
    expect(deleteOutboundFollowMock).toHaveBeenCalledWith(
      expectedActorUri,
      REMOTE.uri,
    );
  });

  it('stays silent when there is no recorded outbound Follow (they followed us)', async () => {
    findOutboundFollowMock.mockResolvedValue(undefined);
    const { federation, sendActivity } = stubFederation();

    await federateUnfollow(federation, ORIGIN, FOLLOWER, REMOTE);

    expect(sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
    expect(deleteOutboundFollowMock).not.toHaveBeenCalled();
  });
});

describe('follow → unfollow → re-follow sequence (#241 review #1)', () => {
  // Walks the deadlock: the first follow records a row; the unfollow sends
  // the Undo and deletes the row; the re-follow therefore sees no row and
  // must send a SECOND Follow (not silently no-op on the stale one).
  it('sends a fresh Follow after the pair has been unfollowed and re-followed', async () => {
    const { federation, sendActivity } = stubFederation();

    // 1. First follow: no row yet → record + send.
    findOutboundFollowMock.mockResolvedValueOnce(undefined);
    await federateFollow(federation, ORIGIN, FOLLOWER, REMOTE);
    expect(sendActivity).toHaveBeenCalledTimes(1);

    // 2. Unfollow: the row recorded in step 1 → send Undo, delete the row.
    findOutboundFollowMock.mockResolvedValueOnce({
      uri: recordedFollowUri,
      type: 'Follow',
      actorUri: expectedActorUri,
      objectUri: REMOTE.uri,
      direction: 'out',
    } as never);
    await federateUnfollow(federation, ORIGIN, FOLLOWER, REMOTE);
    expect(sendActivity).toHaveBeenCalledTimes(2);
    expect(deleteOutboundFollowMock).toHaveBeenCalledTimes(1);
    expect(deleteOutboundFollowMock).toHaveBeenCalledWith(
      expectedActorUri,
      REMOTE.uri,
    );

    // 3. Re-follow: the edge was recreated; the ledger was cleared in step 2,
    //    so no row is found → a second Follow is recorded and sent.
    findOutboundFollowMock.mockResolvedValueOnce(undefined);
    await federateFollow(federation, ORIGIN, FOLLOWER, REMOTE);
    expect(sendActivity).toHaveBeenCalledTimes(3);
    expect(recordApActivityMock).toHaveBeenCalledTimes(3); // 2× Follow + 1× Undo
    expect(
      recordApActivityMock.mock.calls.filter(
        (call) => (call[0] as { type: string }).type === 'Follow',
      ).length,
    ).toBe(2);
  });
});
