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
  findApActivityByUriMock,
  findOutboundFollowMock,
  loadPublicNoteMock,
  peerHostAllowedMock,
  recordApActivityMock,
  deleteOutboundFollowMock,
} = vi.hoisted(() => ({
  findApActivityByUriMock: vi.fn(async (..._args: unknown[]) => undefined),
  findOutboundFollowMock: vi.fn(async (..._args: unknown[]) => undefined),
  loadPublicNoteMock: vi.fn(async (..._args: unknown[]) => null),
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
  // object makes `undo`/`follow`/`note` the same object our assertions
  // inspect. Each class also carries a static `typeId` (as the real classes
  // do) so a test `Context` stub can map a class to its object path.
  const AS = 'https://www.w3.org/ns/activitystreams#';
  const make = (typeId: string) => {
    const Cls = function Cls(props: unknown) {
      return props;
    };
    Object.defineProperty(Cls, 'typeId', {
      get: () => new URL(AS + typeId),
    });
    return Cls;
  };
  return {
    Accept: make('Accept'),
    Create: make('Create'),
    Delete: make('Delete'),
    Endpoints: make('Endpoints'),
    Follow: make('Follow'),
    Image: make('Image'),
    Note: make('Note'),
    Person: make('Person'),
    PUBLIC_COLLECTION: 'Public',
    Tombstone: make('Tombstone'),
    Undo: make('Undo'),
    Update: make('Update'),
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
  findApActivityByUri: findApActivityByUriMock,
  findOutboundFollow: findOutboundFollowMock,
  loadPublicNote: loadPublicNoteMock,
  peerHostAllowed: peerHostAllowedMock,
  recordApActivity: recordApActivityMock,
}));

const {
  dispatchDeleteObject,
  dispatchUpdateObject,
  federateFollow,
  federateUnfollow,
  noteObjectFor,
} = await import('./fedify');

// The mocked vocab `Note` class (the props pass-through from the factory) —
// `Tombstone.formerType` carries this reference.
const { Note } = await import('@fedify/fedify/vocab');

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

// Object-fetching dispatchers for Update/Delete activities (#1028 Phase R,
// review round 4, item 1). An Update's object must be the *current* Note
// (content/attribution/CCs), not a bare URI — consumers that render the
// embedded object (Mastodon) otherwise have nothing to render. A Delete's
// object must be the deleted Note's URI (a tombstone by definition).
const NOTE_URI = `${ORIGIN}/ap/objects/note-1`;
const UPDATE_URI = `${ORIGIN}/ap/update/update-1`;
const DELETE_URI = `${ORIGIN}/ap/delete/delete-1`;

// A minimal Fedify Context stub: the dispatchers only call getObjectUri
// (to build the activity URI they look up in the ledger) plus the
// Note-building helpers in `noteObjectFor`. `getObjectUri` mirrors the real
// path constants (NOTE_PATH=/ap/objects/{id}, UPDATE_PATH=/ap/update/{id},
// DELETE_PATH=/ap/delete/{id}) by mapping each vocab class's `typeId` (carried
// by the mocked classes) to its object path.
const objectPathFor = (cls: { typeId?: URL }): string => {
  const local = cls.typeId?.href.split('#').pop();
  const map: Record<string, string> = {
    Note: 'objects',
    Create: 'create',
    Accept: 'accept',
    Update: 'update',
    Delete: 'delete',
  };
  return map[local ?? ''] ?? 'objects';
};

const stubCtx = () =>
  ({
    getObjectUri: (
      cls: { typeId?: URL },
      values: Record<string, string>,
    ): URL => new URL(`${ORIGIN}/ap/${objectPathFor(cls)}/${values.id}`),
    getActorUri: (identifier: string): URL =>
      new URL(`${ORIGIN}/ap/users/${identifier}`),
    getFollowersUri: (identifier: string): URL =>
      new URL(`${ORIGIN}/ap/users/${identifier}/followers`),
  }) as never;

const note = (content = 'hello') =>
  ({
    id: 'note-1',
    creatorId: 'local-profile-1',
    content,
    published: '2026-01-01T00:00:00.000Z',
    inReplyToUri: null,
    mentionUris: ['https://remote.example/users/mentioned'],
  }) as never;

const activityRow = (uri: string) =>
  ({
    uri,
    actorUri: expectedActorUri,
    objectUri: NOTE_URI,
  }) as never;

// getObjectUri here builds `${ORIGIN}/ap/${id}`; the dispatchers look the row
// up by that exact href, so the ids must mirror the URIs above.
const updateValues = { id: 'update-1' };
const deleteValues = { id: 'delete-1' };

describe('fetched Update/Delete objects (review round 4 item 1)', () => {
  it('Update object embeds the current Note (content/attribution/CCs)', async () => {
    findApActivityByUriMock.mockResolvedValue(activityRow(UPDATE_URI));
    loadPublicNoteMock.mockResolvedValue(note('edited body'));

    const result = (await dispatchUpdateObject(stubCtx(), updateValues)) as {
      id: URL;
      actor: URL;
      object: Record<string, unknown>;
    };

    // The vocab mock returns the constructor props, so `object` is the
    // embedded Note props built by `noteObjectFor`.
    expect(result.id.href).toBe(UPDATE_URI);
    expect(result.actor.href).toBe(expectedActorUri);
    const embedded = result.object as {
      id: URL;
      attribution: URL;
      content: string;
    };
    expect(embedded.id.href).toBe(NOTE_URI);
    expect(embedded.attribution.href).toBe(expectedActorUri);
    // The *current* content is embedded — this is the fix (a URI-only
    // object carried no content to render).
    expect(embedded.content).toBe('edited body');
    // CCs include the followers collection and every remote mentioned actor.
    const ccs = (result.object as { ccs: URL[] }).ccs;
    expect(ccs.map((u) => u.href)).toEqual([
      `${ORIGIN}/ap/users/local-profile-1/followers`,
      'https://remote.example/users/mentioned',
    ]);
    expect(findApActivityByUriMock).toHaveBeenCalledWith(UPDATE_URI);
    expect(loadPublicNoteMock).toHaveBeenCalledWith('note-1');
  });

  it('Update object is a Tombstone when the note no longer resolves as public', async () => {
    findApActivityByUriMock.mockResolvedValue(activityRow(UPDATE_URI));
    loadPublicNoteMock.mockResolvedValue(null);

    const result = (await dispatchUpdateObject(stubCtx(), updateValues)) as {
      id: URL;
      formerType: unknown;
    };

    // `Tombstone` mock returns props: `formerType` is the Note vocab class.
    expect(result.id.href).toBe(NOTE_URI);
    expect(result.formerType).toBe(Note);
  });

  it('Update is null when the ledger has no row for the activity URI', async () => {
    findApActivityByUriMock.mockResolvedValue(undefined);

    const result = await dispatchUpdateObject(stubCtx(), updateValues);

    expect(result).toBeNull();
    expect(loadPublicNoteMock).not.toHaveBeenCalled();
  });

  it('Delete object is the deleted Note URI (a tombstone, no contents)', async () => {
    findApActivityByUriMock.mockResolvedValue(activityRow(DELETE_URI));

    const result = (await dispatchDeleteObject(stubCtx(), deleteValues)) as {
      id: URL;
      actor: URL;
      object: URL;
    };

    expect(result.id.href).toBe(DELETE_URI);
    expect(result.actor.href).toBe(expectedActorUri);
    // Delete embeds the URI, not a Note object — there are no contents left.
    expect(result.object).toBeInstanceOf(URL);
    expect(result.object.href).toBe(NOTE_URI);
    // A Delete never re-loads the note's contents.
    expect(loadPublicNoteMock).not.toHaveBeenCalled();
  });

  it('Delete is null when the ledger has no row for the activity URI', async () => {
    findApActivityByUriMock.mockResolvedValue(undefined);

    const result = await dispatchDeleteObject(stubCtx(), deleteValues);

    expect(result).toBeNull();
  });
});

// `noteObjectFor` is the single source of the Note object shape shared by the
// Note dispatcher and the Update dispatcher. Pin that the `cc` array always
// starts with the followers collection and appends remote mention URIs — the
// Fedify 2.4.6 `ccs` plural-constructor quirk that must not be "simplified".
describe('noteObjectFor (shared Note shape)', () => {
  it('CCs = followers collection + remote mention URIs, in order', () => {
    const result = noteObjectFor(stubCtx(), note('x')) as unknown as {
      ccs: URL[];
    };
    expect(result.ccs.map((u) => u.href)).toEqual([
      `${ORIGIN}/ap/users/local-profile-1/followers`,
      'https://remote.example/users/mentioned',
    ]);
  });

  it('CCs = just the followers collection when there are no remote mentions', () => {
    const result = noteObjectFor(stubCtx(), {
      ...note(),
      mentionUris: [],
    } as never) as unknown as { ccs: URL[] };
    expect(result.ccs.map((u) => u.href)).toEqual([
      `${ORIGIN}/ap/users/local-profile-1/followers`,
    ]);
  });
});
