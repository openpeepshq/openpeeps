import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shape-aware pg mock: loadLocalActor() runs two queries — the handle
// lookup selects only `id`, the by-id load selects the full projection
// including `body` — so rows are dispatched on the selection shape and
// no query reaches postgres. upsertRemoteActor() also issues an `update`
// on the existing-actor branch, so the builder supports both verbs.
const handleLookupRows: Array<Record<string, unknown>> = [];
const actorRows: Array<Record<string, unknown>> = [];

vi.mock('../db/pg/client', () => {
  const selectChain = (rows: Array<Record<string, unknown>>) => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: () => Promise.resolve(rows),
    };
    return builder;
  };
  const updateChain = {
    set: () => updateChain,
    where: () => Promise.resolve({}),
  };
  return {
    pgDb: () => ({
      select: (selection: Record<string, unknown>) =>
        selectChain('body' in selection ? actorRows : handleLookupRows),
      update: () => updateChain,
    }),
  };
});

// upsertRemoteActor() exercises the federation profile lookups, the profile
// writer and the event hub — all mocked so the test asserts the emitted
// event without touching postgres or the mapping layer.
const findProfileByUriResults: Array<unknown> = [];
vi.mock('./profiles', async () => {
  const { vi: vitest } = await import('vitest');
  return {
    findProfileByUri: vitest.fn(async () => findProfileByUriResults.shift()),
    findProfileByHandleAndDomain: vitest.fn(async () => undefined),
  };
});
const profilesMappingCreate = vi.fn(async () => ({ id: 'new-id' }));
const profilesMappingUpdate = vi.fn(async () => ({ id: 'p1' }));
vi.mock('../profiles/mapping', () => ({
  profilesMapping: {
    create: (...args: unknown[]) => profilesMappingCreate(...args),
    update: (...args: unknown[]) => profilesMappingUpdate(...args),
  },
}));
const hubEmit = vi.fn(async () => {});
vi.mock('../events', () => ({
  hub: { emit: (...args: unknown[]) => hubEmit(...args) },
}));
vi.mock('../db', () => ({ allpeepDb: () => Promise.resolve({ db: {} }) }));

const { loadLocalActor, upsertRemoteActor } = await import('./actors');

const profileRow = (body: unknown) => ({
  id: 'p1',
  handle: 'alice',
  type: 'local',
  body,
  createdAt: '2026-11-17T00:00:00.000Z',
  deletedAt: null,
});

const remoteProfile = (id: string) => ({
  id,
  handle: 'remote',
  type: 'federated',
  uri: 'https://remote.example/users/remote',
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

describe('upsertRemoteActor content-change emission', () => {
  beforeEach(() => {
    findProfileByUriResults.length = 0;
    profilesMappingCreate.mockClear();
    profilesMappingUpdate.mockClear();
    hubEmit.mockClear();
  });

  it('emits profileContentChanged when a new remote actor is created', async () => {
    findProfileByUriResults.push(undefined, remoteProfile('new-id'));
    const result = await upsertRemoteActor({
      uri: 'https://remote.example/users/remote',
      handle: 'remote',
      domain: 'remote.example',
      displayName: 'Remote',
      bio: 'a bio',
    });
    expect(profilesMappingCreate).toHaveBeenCalledOnce();
    expect(hubEmit).toHaveBeenCalledWith('profileContentChanged', result);
  });

  it('emits profileContentChanged when a body field changes on refresh', async () => {
    findProfileByUriResults.push(remoteProfile('p1'), remoteProfile('p1'));
    await upsertRemoteActor({
      uri: 'https://remote.example/users/remote',
      handle: 'remote',
      domain: 'remote.example',
      displayName: 'Remote',
    });
    expect(profilesMappingUpdate).toHaveBeenCalledOnce();
    expect(hubEmit).toHaveBeenCalledWith(
      'profileContentChanged',
      remoteProfile('p1'),
    );
  });

  it('does not emit on an inbox-only refresh (no embeddable content change)', async () => {
    findProfileByUriResults.push(remoteProfile('p1'), remoteProfile('p1'));
    await upsertRemoteActor({
      uri: 'https://remote.example/users/remote',
      handle: 'remote',
      domain: 'remote.example',
      inboxUrl: 'https://remote.example/inbox',
    });
    expect(profilesMappingUpdate).not.toHaveBeenCalled();
    expect(hubEmit).not.toHaveBeenCalled();
  });
});
