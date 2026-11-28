import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertState = vi.hoisted(() => ({
  existingByUri: undefined as unknown,
  existingByHandleDomain: undefined as unknown,
  storedProfile: undefined as unknown,
  uriCalls: 0,
  createdPayload: null as unknown,
}));

// Shape-aware pg mock: loadLocalActor() runs two queries — the handle
// lookup selects only `id`, the by-id load selects the full projection
// including `body` — so rows are dispatched on the selection shape and
// no query reaches postgres. upsertRemoteActor() only issues an UPDATE on
// the already-ingested path, which the tests never take.
const handleLookupRows: Array<Record<string, unknown>> = [];
const actorRows: Array<Record<string, unknown>> = [];

vi.mock('../db/pg/client', () => {
  const chain = (rows: Array<Record<string, unknown>>) => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: () => Promise.resolve(rows),
    };
    return builder;
  };
  const update = () => {
    const builder = {
      set: () => builder,
      where: () => Promise.resolve([]),
    };
    return builder;
  };
  return {
    pgDb: () => ({
      select: (selection: Record<string, unknown>) =>
        chain('body' in selection ? actorRows : handleLookupRows),
      update: () => update(),
    }),
  };
});

vi.mock('../db', () => ({
  allpeepDb: async () => ({ db: {} }),
}));

vi.mock('../db/pg/mappers', () => ({
  nowIso: () => '2026-11-28T00:00:00.000Z',
}));

vi.mock('./profiles', () => ({
  findProfileByUri: async () => {
    // `upsertRemoteActor` calls this once at the top (existence check — only
    // `existingByUri` is visible then) and once at the end (returns the
    // freshly stored profile).
    upsertState.uriCalls += 1;
    return upsertState.uriCalls > 1
      ? (upsertState.existingByUri ?? upsertState.storedProfile)
      : upsertState.existingByUri;
  },
  findProfileByHandleAndDomain: async () => upsertState.existingByHandleDomain,
}));

vi.mock('../profiles/mapping', () => ({
  profilesMapping: {
    create: async (_db: unknown, payload: unknown) => {
      upsertState.createdPayload = payload;
    },
    update: async () => undefined,
  },
}));

const { federatedHandleFrom, loadLocalActor, upsertRemoteActor } = await import(
  './actors'
);

const profileRow = (body: unknown) => ({
  id: 'p1',
  handle: 'alice',
  type: 'local',
  body,
  createdAt: '2026-11-17T00:00:00.000Z',
  deletedAt: null,
});

describe('loadLocalActor discoverable projection', () => {
  beforeEach(() => {
    handleLookupRows.length = 0;
    actorRows.length = 0;
  });

  it('normalizes an explicit opt-out to discoverable: false', async () => {
    actorRows.push(profileRow({ discoverable: false }));
    const actor = await loadLocalActor('p1');
    expect(actor).not.toBeNull();
    expect(actor?.discoverable).toBe(false);
  });

  it('omits discoverable when the flag is absent', async () => {
    actorRows.push(profileRow({}));
    const actor = await loadLocalActor('p1');
    expect(actor?.discoverable).toBeUndefined();
  });

  it('omits discoverable when the flag is true', async () => {
    actorRows.push(profileRow({ discoverable: true }));
    const actor = await loadLocalActor('p1');
    expect(actor?.discoverable).toBeUndefined();
  });

  it('returns null for non-local profile rows', async () => {
    actorRows.push({ ...profileRow({ discoverable: false }), type: 'remote' });
    expect(await loadLocalActor('p1')).toBeNull();
  });
});

describe('upsertRemoteActor handleTaken branch', () => {
  beforeEach(() => {
    handleLookupRows.length = 0;
    actorRows.length = 0;
    upsertState.existingByUri = undefined;
    upsertState.existingByHandleDomain = undefined;
    upsertState.storedProfile = undefined;
    upsertState.uriCalls = 0;
    upsertState.createdPayload = null;
  });

  it('keeps the typed handle when nothing collides on handle+domain', async () => {
    upsertState.storedProfile = {
      id: 'new-1',
      handle: 'alice',
      type: 'federated',
      activityPub: { domain: 'mastodon.social' },
    };

    await upsertRemoteActor({
      uri: 'https://mastodon.social/users/alice',
      handle: 'alice',
      domain: 'mastodon.social',
    });

    expect(upsertState.createdPayload).toMatchObject({
      handle: 'alice',
      type: 'federated',
      uri: 'https://mastodon.social/users/alice',
    });
  });

  it('derives an `actor-…` handle when the handle is already taken on the same domain', async () => {
    // A local profile (or any profile) with the same bare handle on the same
    // domain means the typed handle collides; the ingested actor must not
    // steal it and instead falls back to a URI-derived `actor-…` handle.
    upsertState.existingByHandleDomain = {
      id: 'local-1',
      handle: 'alice',
      type: 'local',
    };
    upsertState.storedProfile = {
      id: 'new-1',
      handle: federatedHandleFrom(null, 'https://mastodon.social/users/alice'),
      type: 'federated',
      activityPub: { domain: 'mastodon.social' },
    };

    await upsertRemoteActor({
      uri: 'https://mastodon.social/users/alice',
      handle: 'alice',
      domain: 'mastodon.social',
    });

    const expected = federatedHandleFrom(
      null,
      'https://mastodon.social/users/alice',
    );
    expect(expected).toMatch(/^actor-/);
    expect(upsertState.createdPayload).toMatchObject({
      handle: expected,
      type: 'federated',
      activityPub: { domain: 'mastodon.social' },
    });
    // The derived handle differs from the colliding bare handle.
    expect((upsertState.createdPayload as { handle: string }).handle).not.toBe(
      'alice',
    );
  });
});
