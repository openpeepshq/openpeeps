import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pins the G1 edit/delete wiring added by PR #2336: `federateNoteUpdate`
// must send an `Update(Note)` to the followers collection while
// `federateNoteDelete` must send a `Delete(tombstone)` whose object is the
// pre-delete Note URI, and both must no-op on the non-note / deleted-actor
// guards. `recordApActivity` records the same activity type the wire carries,
// so it doubles as a stable discriminator for which activity was dispatched
// without depending on Fedify's internal object serialization.
const {
  loadLocalActor: loadLocalActorMock,
  loadPublicNote: loadPublicNoteMock,
  recordApActivity: recordApActivityMock,
} = vi.hoisted(() => ({
  loadLocalActor: vi.fn(),
  loadPublicNote: vi.fn(),
  recordApActivity: vi.fn(),
}));

vi.mock('@openpeepshq/core/federation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openpeepshq/core/federation')>()),
  loadLocalActor: loadLocalActorMock,
  loadPublicNote: loadPublicNoteMock,
  recordApActivity: recordApActivityMock,
}));

import { Update, Delete } from '@fedify/fedify/vocab';
import type { Federation } from '@fedify/fedify';
import { federateNoteDelete, federateNoteUpdate } from '../fedify';

const localActor = { id: 'local-1', handle: 'alice', deleted: false };

const note = {
  id: 'post-1',
  creatorId: 'local-1',
  content: 'hello',
  published: '2026-01-01T00:00:00.000Z',
  inReplyToUri: null,
  mentionUris: [],
};

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
      getObjectUri: (_type: unknown, { id }: { id: string }) =>
        new URL(`http://origin/ap/objects/${id}`),
    })),
    sendActivity,
  } as unknown as Federation<void> & { sendActivity: typeof sendActivity };
  return federation;
};

describe('federateNoteUpdate', () => {
  beforeEach(() => {
    loadLocalActorMock.mockReset();
    loadPublicNoteMock.mockReset();
    recordApActivityMock.mockReset();
  });

  it('sends an Update to followers while the note is still public', async () => {
    loadLocalActorMock.mockResolvedValue(localActor);
    loadPublicNoteMock.mockResolvedValue(note);
    const federation = makeFederation();

    await federateNoteUpdate(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      data: { type: 'note' },
    });

    expect(federation.sendActivity).toHaveBeenCalledTimes(1);
    const [identifier, target, activity, opts] =
      federation.sendActivity.mock.calls[0];
    expect(identifier).toEqual({ identifier: 'local-1' });
    expect(target).toBe('followers');
    expect(activity).toBeInstanceOf(Update);
    expect(opts).toEqual({ preferSharedInbox: true });
    expect(recordApActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Update', direction: 'out' }),
    );
  });

  it('sends a tombstone Delete when a public note no longer resolves as public', async () => {
    // The emitted post is still public but `loadPublicNote` no longer sees it
    // (edited down to non-public once visibility becomes mutable, or a delete
    // race). Remote readers can only receive a tombstone in that case.
    loadLocalActorMock.mockResolvedValue(localActor);
    loadPublicNoteMock.mockResolvedValue(null);
    const federation = makeFederation();

    await federateNoteUpdate(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      data: { type: 'note' },
    });

    expect(federation.sendActivity).toHaveBeenCalledTimes(1);
    const [, , activity] = federation.sendActivity.mock.calls[0];
    expect(activity).toBeInstanceOf(Delete);
    expect(recordApActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Delete', direction: 'out' }),
    );
  });

  it('is a no-op when editing a never-public note (its URI was never delivered)', async () => {
    loadLocalActorMock.mockResolvedValue(localActor);
    loadPublicNoteMock.mockResolvedValue(null);
    const federation = makeFederation();

    await federateNoteUpdate(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'private',
      data: { type: 'note' },
    });

    // `loadPublicNote` must not even be reached: no tombstone, no record.
    expect(loadPublicNoteMock).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });

  it('is a no-op for a non-note post', async () => {
    loadLocalActorMock.mockResolvedValue(localActor);
    loadPublicNoteMock.mockResolvedValue(note);
    const federation = makeFederation();

    await federateNoteUpdate(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      data: { type: 'repost' },
    });

    expect(federation.createContext).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });

  it('is a no-op when the actor is deleted', async () => {
    loadLocalActorMock.mockResolvedValue({ ...localActor, deleted: true });
    const federation = makeFederation();

    await federateNoteUpdate(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      data: { type: 'note' },
    });

    expect(federation.createContext).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });

  it('aborts the send when the ledger write rejects (no remote Update)', async () => {
    // The ledger write runs before the send (`recordApActivity` then
    // `ctx.sendActivity`), so a failed ledger write rejects out of this
    // function before anything is dispatched. The install.ts handler attaches
    // `.catch(...)` and logs in the fire-and-forget context; calling the
    // function directly here pins the ordering contract: the send is aborted
    // and the rejection propagates to that handler. This also documents the
    // loss window the ledger-first ordering creates — the activity row may
    // exist (or the write may have partially landed) while nothing is sent
    // remotely, and no retry re-sends it.
    loadLocalActorMock.mockResolvedValue(localActor);
    loadPublicNoteMock.mockResolvedValue(note);
    recordApActivityMock.mockRejectedValue(new Error('ledger down'));
    const federation = makeFederation();

    await expect(
      federateNoteUpdate(federation, 'http://origin', {
        id: 'post-1',
        creatorId: 'local-1',
        visibility: 'public',
        data: { type: 'note' },
      }),
    ).rejects.toThrow('ledger down');

    // The ledger write was attempted (then rejected), but the remote send never ran.
    expect(recordApActivityMock).toHaveBeenCalledTimes(1);
    expect(federation.sendActivity).not.toHaveBeenCalled();
  });
});

describe('federateNoteDelete', () => {
  beforeEach(() => {
    loadLocalActorMock.mockReset();
    recordApActivityMock.mockReset();
  });

  it('sends a Delete(tombstone) whose object is the pre-delete post.uri', async () => {
    loadLocalActorMock.mockResolvedValue(localActor);
    const federation = makeFederation();

    await federateNoteDelete(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      uri: 'http://origin/ap/objects/post-1',
      data: { type: 'note' },
    });

    expect(federation.sendActivity).toHaveBeenCalledTimes(1);
    const [identifier, target, activity, opts] =
      federation.sendActivity.mock.calls[0];
    expect(identifier).toEqual({ identifier: 'local-1' });
    expect(target).toBe('followers');
    expect(activity).toBeInstanceOf(Delete);
    expect(opts).toEqual({ preferSharedInbox: true });
    expect(recordApActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Delete',
        objectUri: 'http://origin/ap/objects/post-1',
        direction: 'out',
      }),
    );
  });

  it('is a no-op for a non-public post', async () => {
    loadLocalActorMock.mockResolvedValue(localActor);
    const federation = makeFederation();

    await federateNoteDelete(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'private',
      uri: 'http://origin/ap/objects/post-1',
      data: { type: 'note' },
    });

    expect(federation.createContext).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });

  it('is a no-op when the pre-delete post.uri is missing', async () => {
    loadLocalActorMock.mockResolvedValue(localActor);
    const federation = makeFederation();

    await federateNoteDelete(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      uri: null,
      data: { type: 'note' },
    });

    expect(federation.createContext).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });

  it('is a no-op when the actor is deleted', async () => {
    loadLocalActorMock.mockResolvedValue({ ...localActor, deleted: true });
    const federation = makeFederation();

    await federateNoteDelete(federation, 'http://origin', {
      id: 'post-1',
      creatorId: 'local-1',
      visibility: 'public',
      uri: 'http://origin/ap/objects/post-1',
      data: { type: 'note' },
    });

    expect(federation.createContext).not.toHaveBeenCalled();
    expect(federation.sendActivity).not.toHaveBeenCalled();
    expect(recordApActivityMock).not.toHaveBeenCalled();
  });

  it('aborts the send when the ledger write rejects (no remote Delete)', async () => {
    // Mirror of the Update case: `recordApActivity` precedes the send, so a
    // rejected ledger write rejects before the tombstone `Delete` is
    // dispatched — no remote write, and the install.ts handler's `.catch`
    // logs the failure in the fire-and-forget context.
    loadLocalActorMock.mockResolvedValue(localActor);
    recordApActivityMock.mockRejectedValue(new Error('ledger down'));
    const federation = makeFederation();

    await expect(
      federateNoteDelete(federation, 'http://origin', {
        id: 'post-1',
        creatorId: 'local-1',
        visibility: 'public',
        uri: 'http://origin/ap/objects/post-1',
        data: { type: 'note' },
      }),
    ).rejects.toThrow('ledger down');

    expect(recordApActivityMock).toHaveBeenCalledTimes(1);
    expect(federation.sendActivity).not.toHaveBeenCalled();
  });
});
