import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shape-aware pg mock: loadLocalActor() runs two queries — the handle
// lookup selects only `id`, the by-id load selects the full projection
// including `body` — so rows are dispatched on the selection shape and
// no query reaches postgres.
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
  return {
    pgDb: () => ({
      select: (selection: Record<string, unknown>) =>
        chain('body' in selection ? actorRows : handleLookupRows),
    }),
  };
});

const { loadLocalActor } = await import('./actors');

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
