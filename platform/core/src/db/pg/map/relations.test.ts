import { describe, expect, it } from 'vitest';
import { getTableName, type Table } from 'drizzle-orm';
import type { PgDb } from '../client';
import { documentKeyBefore } from '../filters';
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

  it('relationsFrom skipEdge applies documentKeyBefore SQL filter', async () => {
    // Fake DB cannot evaluate Drizzle SQL predicates; instead assert that the
    // skipEdge path builds a filtered select (where + orderBy) rather than a
    // bare fetchRowsByIds query that ignored `start` cursors (#1121).
    const calls: { table: string; usedWhere: boolean; usedOrderBy: boolean }[] =
      [];
    const rowsByTable: Record<string, Row[]> = {
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
    };
    const db = {
      select: () => ({
        from: (table: unknown) => {
          const name = getTableName(table as Table);
          const state = { usedWhere: false, usedOrderBy: false };
          const result = Promise.resolve(rowsByTable[name] ?? []).then(
            (rows) => {
              calls.push({ ...state, table: name });
              return rows;
            },
          );
          const api: Record<string, unknown> = {
            where: () => {
              state.usedWhere = true;
              return api;
            },
            limit: () => api,
            orderBy: () => {
              state.usedOrderBy = true;
              return api;
            },
            offset: () => api,
            $dynamic: () => api,
            then: result.then.bind(result),
            catch: result.catch.bind(result),
            finally: result.finally.bind(result),
          };
          return api;
        },
      }),
    } as unknown as PgDb;

    await relationsFrom(db, { id: 'parent' }, 'posts', {
      alias: 'replies',
      edgeCollection: 'replyTo',
      direction: 'INBOUND',
      cardinality: 'many',
      skipEdge: true,
      mapping: {
        collection: 'posts',
        filters: [documentKeyBefore('posts', 'child-2')],
        sort: [['DOC.id', 'DESC']],
      },
    });

    const postsQuery = calls.find((c) => c.table === 'posts');
    expect(postsQuery?.usedWhere).toBe(true);
    expect(postsQuery?.usedOrderBy).toBe(true);
  });

  it('relationsFrom honors maxDepth and returns nested descendents', async () => {
    const db = createFakeDb({
      reply_to: [
        { id: 'r1', fromId: 'child-1', toId: 'root', body: {}, ...stamp },
        { id: 'r2', fromId: 'child-2', toId: 'child-1', body: {}, ...stamp },
      ],
      posts: [
        {
          id: 'child-1',
          type: 'note',
          visibility: 'direct',
          creatorId: 'p1',
          body: { text: 'one' },
          ...stamp,
        },
        {
          id: 'child-2',
          type: 'note',
          visibility: 'direct',
          creatorId: 'p1',
          body: { text: 'two' },
          ...stamp,
        },
      ],
    });

    const mapping: MapData<object, object> = { collection: 'posts' };
    const replies = await relationsFrom(db, { id: 'root' }, 'posts', {
      alias: 'context',
      edgeCollection: 'replyTo',
      direction: 'INBOUND',
      cardinality: 'many',
      skipEdge: true,
      maxDepth: 9999,
      mapping,
    });

    expect(replies.map((r) => r.id).sort()).toEqual(['child-1', 'child-2']);
  });

  it('relationsFrom applies mapping sort so ancestors are root-first', async () => {
    // UUIDv7-style ids: earlier messages sort first with DOC.id ASC.
    const db = createFakeDb({
      reply_to: [
        { id: 'r1', fromId: '002-mid', toId: '001-root', body: {}, ...stamp },
        { id: 'r2', fromId: '003-leaf', toId: '002-mid', body: {}, ...stamp },
      ],
      posts: [
        {
          id: '001-root',
          type: 'note',
          visibility: 'direct',
          creatorId: 'p1',
          body: { text: 'root' },
          ...stamp,
        },
        {
          id: '002-mid',
          type: 'note',
          visibility: 'direct',
          creatorId: 'p1',
          body: { text: 'mid' },
          ...stamp,
        },
      ],
    });

    const mapping: MapData<object, object> = {
      collection: 'posts',
      sort: [['DOC.id', 'ASC']],
    };
    const ancestors = await relationsFrom(db, { id: '003-leaf' }, 'posts', {
      alias: 'context',
      edgeCollection: 'replyTo',
      direction: 'OUTBOUND',
      cardinality: 'many',
      skipEdge: true,
      maxDepth: 9999,
      mapping,
    });

    // BFS alone would be [002-mid, 001-root]; id ASC puts the true root first.
    expect(ancestors.map((r) => r.id)).toEqual(['001-root', '002-mid']);
  });

  it('relationsFrom honors mapping.limit during BFS traversal', async () => {
    const db = createFakeDb({
      reply_to: [
        { id: 'r1', fromId: 'c1', toId: 'root', body: {}, ...stamp },
        { id: 'r2', fromId: 'c2', toId: 'root', body: {}, ...stamp },
        { id: 'r3', fromId: 'c3', toId: 'root', body: {}, ...stamp },
      ],
      posts: [
        {
          id: 'c1',
          type: 'note',
          visibility: 'public',
          creatorId: 'p1',
          body: {},
          ...stamp,
        },
        {
          id: 'c2',
          type: 'note',
          visibility: 'public',
          creatorId: 'p1',
          body: {},
          ...stamp,
        },
        {
          id: 'c3',
          type: 'note',
          visibility: 'public',
          creatorId: 'p1',
          body: {},
          ...stamp,
        },
      ],
    });

    const mapping: MapData<object, object> = {
      collection: 'posts',
      limit: 2,
    };
    const replies = await relationsFrom(db, { id: 'root' }, 'posts', {
      alias: 'context',
      edgeCollection: 'replyTo',
      direction: 'INBOUND',
      cardinality: 'many',
      skipEdge: true,
      maxDepth: 9999,
      mapping,
    });

    expect(replies).toHaveLength(2);
  });

  it('hydrateMapData uses batchResolve for derived properties', async () => {
    const db = createFakeDb({});
    let batchCalls = 0;
    const docs = await hydrateMapData(
      db,
      {
        collection: 'posts',
        postFilterDerivedProperties: [
          {
            alias: 'seen',
            resolve: () => false,
            batchResolve: (_db, batch) => {
              batchCalls += 1;
              return new Map(batch.map((d) => [d.id as string, true]));
            },
          },
        ],
      },
      [
        { id: 'a', type: 'note' },
        { id: 'b', type: 'note' },
      ],
    );
    expect(batchCalls).toBe(1);
    expect(docs.map((d) => d.seen)).toEqual([true, true]);
  });
});
