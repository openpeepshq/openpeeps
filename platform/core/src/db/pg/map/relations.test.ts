import { describe, expect, it } from 'vitest';
import { getTableName, type Table } from 'drizzle-orm';
import type { PgDb } from '../client';
import { fetchRowsByIds, hydrateMapData, relationsFrom } from './relations';
import type { MapData, Relation } from './queryTypes';

type Row = Record<string, unknown>;

const createFakeDb = (rowsByTable: Record<string, Row[]>): PgDb => {
  const rowsFor = (table: unknown): Row[] => {
    const name = getTableName(table as Table);
    return rowsByTable[name] ?? [];
  };

  const chain = (table: unknown) => {
    const result = Promise.resolve(rowsFor(table));
    const api: Record<string, unknown> = {
      where: () => api,
      limit: () => api,
      orderBy: () => api,
      offset: () => api,
      $dynamic: () => api,
      then: result.then.bind(result),
      catch: result.catch.bind(result),
      finally: result.finally.bind(result),
    };
    return api;
  };

  return {
    select: () => ({
      from: (table: unknown) => chain(table),
    }),
  } as unknown as PgDb;
};

const stamp = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

describe('map relations', () => {
  it('fetchRowsByIds returns empty for no ids and maps soft-deleted tables', async () => {
    const db = createFakeDb({
      profiles: [
        {
          id: 'p1',
          handle: 'alice',
          type: 'local',
          body: { displayName: 'Alice' },
          ...stamp,
        },
      ],
    });

    expect(await fetchRowsByIds(db, 'profiles', [])).toEqual([]);
    const rows = await fetchRowsByIds(db, 'profiles', ['p1']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'p1',
      handle: 'alice',
      displayName: 'Alice',
    });
  });

  it('hydrateMapData applies post-filters and sort without relations', async () => {
    const db = createFakeDb({});
    const docs = await hydrateMapData(
      db,
      {
        collection: 'posts',
        filters: [{ matches: { visibility: 'public' } }],
        sort: [['createdAt', 'DESC']],
      },
      [
        {
          id: '1',
          visibility: 'public',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          visibility: 'direct',
          createdAt: '2026-02-01T00:00:00.000Z',
        },
        {
          id: '3',
          visibility: 'public',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    );

    expect(docs.map((d) => d.id)).toEqual(['3', '1']);
  });

  it('attaches outbound skipEdge relations from edge rows', async () => {
    const db = createFakeDb({
      user_groups: [
        {
          id: 'e1',
          fromId: 'p1',
          toId: 'g1',
          body: { roles: ['member'] },
          ...stamp,
        },
        {
          id: 'e2',
          fromId: 'p1',
          toId: 'g2',
          body: { roles: ['admin'] },
          ...stamp,
        },
      ],
      groups: [
        { id: 'g1', handle: 'alpha', body: { name: 'Alpha' }, ...stamp },
        { id: 'g2', handle: 'beta', body: { name: 'Beta' }, ...stamp },
      ],
    });

    const relation: Relation = {
      alias: 'groups',
      edgeCollection: 'userGroups',
      direction: 'OUTBOUND',
      cardinality: 'many',
      skipEdge: true,
      mapping: { collection: 'groups' },
    };

    const docs = await hydrateMapData(
      db,
      { collection: 'profiles', relations: [relation] },
      [{ id: 'p1', handle: 'alice' }],
    );

    expect(docs).toHaveLength(1);
    const groups = docs[0].groups as Row[];
    expect(groups.map((g) => g.id).sort()).toEqual(['g1', 'g2']);
    expect(groups[0]).toMatchObject({ handle: expect.any(String) });
  });

  it('attaches relation counts and vertexAlias edge payloads', async () => {
    const db = createFakeDb({
      follows: [
        { id: 'f1', fromId: 'p1', toId: 'p2', body: {}, ...stamp },
        { id: 'f2', fromId: 'p1', toId: 'p3', body: {}, ...stamp },
      ],
      profiles: [
        { id: 'p2', handle: 'bob', type: 'local', body: {}, ...stamp },
        { id: 'p3', handle: 'cara', type: 'local', body: {}, ...stamp },
      ],
    });

    const countRelation: Relation = {
      alias: 'followingCount',
      edgeCollection: 'follows',
      direction: 'OUTBOUND',
      cardinality: 'many',
      count: true,
    };

    const counted = await hydrateMapData(
      db,
      { collection: 'profiles', relations: [countRelation] },
      [{ id: 'p1' }],
    );
    expect(counted[0].followingCount).toBe(2);

    const aliasRelation: Relation = {
      alias: 'following',
      edgeCollection: 'follows',
      direction: 'OUTBOUND',
      cardinality: 'many',
      vertexAlias: 'profile',
      mapping: { collection: 'profiles' },
    };

    const aliased = await hydrateMapData(
      db,
      { collection: 'profiles', relations: [aliasRelation] },
      [{ id: 'p1' }],
    );
    const following = aliased[0].following as Row[];
    expect(following).toHaveLength(2);
    expect(following[0]).toMatchObject({
      id: 'f1',
      profile: expect.objectContaining({ id: 'p2', handle: 'bob' }),
    });
  });

  it('relationsFrom returns skipEdge vertices and count rows', async () => {
    const db = createFakeDb({
      reply_to: [
        { id: 'r1', fromId: 'child-1', toId: 'parent', body: {}, ...stamp },
        { id: 'r2', fromId: 'child-2', toId: 'parent', body: {}, ...stamp },
      ],
      posts: [
        {
          id: 'child-1',
          type: 'note',
          visibility: 'public',
          creatorId: 'p1',
          body: { text: 'one' },
          ...stamp,
        },
        {
          id: 'child-2',
          type: 'note',
          visibility: 'public',
          creatorId: 'p1',
          body: { text: 'two' },
          ...stamp,
        },
      ],
    });

    const mapping: MapData<object, object> = { collection: 'posts' };
    const replies = await relationsFrom(db, { id: 'parent' }, 'posts', {
      alias: 'replies',
      edgeCollection: 'replyTo',
      direction: 'INBOUND',
      cardinality: 'many',
      skipEdge: true,
      mapping,
    });
    expect(replies.map((r) => r.id).sort()).toEqual(['child-1', 'child-2']);

    const counted = await relationsFrom(db, { id: 'parent' }, 'posts', {
      alias: 'replyCount',
      edgeCollection: 'replyTo',
      direction: 'INBOUND',
      cardinality: 'many',
      count: true,
      mapping,
    });
    expect(counted).toEqual([{ count: 2 }]);
  });
});
