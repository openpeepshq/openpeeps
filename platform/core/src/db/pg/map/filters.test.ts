import { describe, expect, it } from 'vitest';
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { pgSql } from '../filters/types';
import { addFilter } from './helpers';
import {
  applyLimit,
  applyPostFilters,
  applySort,
  evaluateFilter,
  evaluateStringFilter,
  filterToSql,
  partitionFilters,
  sortToSqlOrderBy,
  stringFilterToSql,
} from './filters';
import { getTableForCollection } from './registry';

const dialect = new PgDialect();

// Rendered text plus params, so assertions can match both column
// references and bound literals.
const flattenSql = (value: unknown): string => {
  if (value == null) return '';
  const query = dialect.sqlToQuery((value as SQLWrapper).getSQL());
  return `${query.sql} ${JSON.stringify(query.params)}`;
};

const postsTable = getTableForCollection('posts');
const groupsTable = getTableForCollection('groups');
const followsTable = getTableForCollection('follows');

describe('map filters evaluation', () => {
  it('evaluates match filters including _key and edge refs', () => {
    const doc = {
      id: 'post-1',
      visibility: 'public',
      _from: 'profiles/alice',
      _to: 'posts/post-1',
    };

    expect(evaluateFilter(doc, { matches: { visibility: 'public' } })).toBe(
      true,
    );
    expect(evaluateFilter(doc, { matches: { _key: 'post-1' } })).toBe(true);
    expect(evaluateFilter(doc, { matches: { _from: 'profiles/alice' } })).toBe(
      true,
    );
    expect(evaluateFilter(doc, { matches: { _to: 'profiles/other' } })).toBe(
      false,
    );
  });

  it('evaluates compound and/or filters and skips sql predicates as true', () => {
    const doc = { id: '1', visibility: 'local' };
    expect(
      evaluateFilter(doc, {
        operator: '&&',
        predicates: [
          { matches: { visibility: 'local' } },
          { matches: { id: '1' } },
        ],
      }),
    ).toBe(true);
    expect(
      evaluateFilter(doc, {
        operator: '||',
        predicates: [
          { matches: { visibility: 'public' } },
          { matches: { visibility: 'local' } },
        ],
      }),
    ).toBe(true);
    expect(
      evaluateFilter(doc, {
        operator: '&&',
        predicates: [pgSql(sql`true`), { matches: { visibility: 'direct' } }],
      }),
    ).toBe(false);
  });

  it('evaluates string filters with DATE_TIMESTAMP, LENGTH, and capabilities', () => {
    const start = Date.parse('2026-01-01T00:00:00.000Z');
    const doc = {
      createdAt: '2026-01-15T00:00:00.000Z',
      tags: ['a', 'b'],
      capabilities: { add: ['core-posts-read'], remove: [] },
    };

    expect(
      evaluateStringFilter(doc, `DATE_TIMESTAMP(DOC.createdAt) >= ${start}`),
    ).toBe(true);
    expect(evaluateStringFilter(doc, 'LENGTH(DOC.tags) == 2')).toBe(true);
    expect(
      evaluateStringFilter(
        doc,
        'CHECK_CAPABILITIES(["core-posts-read"], DOC.capabilities).success',
      ),
    ).toBe(true);
    expect(
      evaluateStringFilter(
        doc,
        'CHECK_CAPABILITIES(["core-posts-delete"], MERGE_CAPABILITIES([DOC.capabilities])).success',
      ),
    ).toBe(false);
  });

  it('returns false for invalid string expressions', () => {
    expect(evaluateStringFilter({}, 'DOC.nope(')).toBe(false);
  });
});

describe('map filters sql conversion', () => {
  it('converts scalar and edge matchers to sql', () => {
    const visibility = filterToSql('posts', postsTable, {
      matches: { visibility: 'public', creatorId: 'p1' },
    });
    const key = filterToSql('posts', postsTable, { matches: { _key: 'abc' } });
    const edge = filterToSql('follows', followsTable, {
      matches: { _from: 'profiles/a', _to: 'profiles/b' },
    });
    const jamRecordingsTable = getTableForCollection('jamRecordings');
    const edgeBody = filterToSql('jamRecordings', jamRecordingsTable, {
      matches: { _to: 'posts/jam1', status: 'active' },
    });

    expect(visibility).toBeDefined();
    expect(key).toBeDefined();
    expect(edge).toBeDefined();
    expect(edgeBody).toBeDefined();
    expect(flattenSql(visibility)).toContain('public');
    expect(flattenSql(edge)).toContain('"a"');
    expect(flattenSql(edgeBody)).toContain('active');
    expect(flattenSql(edgeBody)).toContain('jam1');
  });

  it('converts replyCount comparisons via postReplyCountExpr with uuid text cast', () => {
    const filter = stringFilterToSql(
      'posts',
      postsTable,
      'DOC.replyCount == 0',
    );
    expect(filter).toBeDefined();
    const flat = flattenSql(filter);
    expect(flat).toContain('::text');
    expect(flat).toContain('from_id');
    expect(flat).toContain('deleted_at');
  });

  it('converts past-event coalesce filters for posts', () => {
    const now = '2026-06-01T00:00:00.000Z';
    const past = stringFilterToSql(
      'posts',
      postsTable,
      `(DOC.data.end || DOC.data.start) < '${now}'`,
    );
    expect(past).toBeDefined();
    expect(flattenSql(past)).toContain('COALESCE');
  });

  it('converts nested and/or event filters without recursing forever', () => {
    const now = '2026-06-01T00:00:00.000Z';
    expect(
      stringFilterToSql(
        'posts',
        postsTable,
        `((DOC.data.start > '${now}') || (DOC.data.end && DOC.data.end > '${now}'))`,
      ),
    ).toBeDefined();
    expect(
      stringFilterToSql(
        'posts',
        postsTable,
        `DOC.data.start <= '${now}' && (!DOC.data.end || DOC.data.end >= '${now}')`,
      ),
    ).toBeDefined();
  });

  it('converts and/or string filters and leaves capability expressions for post-filtering', () => {
    const compound = stringFilterToSql(
      'posts',
      postsTable,
      "DOC.visibility == 'public' && DOC.type == 'note'",
    );
    expect(compound).toBeDefined();

    const capability = stringFilterToSql(
      'posts',
      postsTable,
      'CHECK_CAPABILITIES(["core-posts-read"], DOC.capabilities).success',
    );
    expect(capability).toBeUndefined();
  });

  it('partitions convertible filters into sql and leaves the rest for post-filtering', () => {
    const { sqlWhere, postFilters } = partitionFilters(
      'posts',
      postsTable,
      [
        { matches: { visibility: 'public' } },
        'CHECK_CAPABILITIES(["core-posts-read"], DOC.capabilities).success',
        pgSql(sql`true` as SQL),
      ],
      undefined,
      true,
    );

    expect(sqlWhere).toBeDefined();
    expect(flattenSql(sqlWhere)).toContain('deleted');
    expect(postFilters).toHaveLength(1);
    expect(postFilters[0]).toContain('CHECK_CAPABILITIES');
  });

  it('omits soft-delete when softDelete is false', () => {
    const { sqlWhere } = partitionFilters(
      'posts',
      postsTable,
      [{ matches: { visibility: 'public' } }],
      undefined,
      false,
    );
    expect(flattenSql(sqlWhere)).not.toContain('deleted');
  });

  it('builds order-by for known sort paths including replyCount', () => {
    const order = sortToSqlOrderBy('posts', postsTable, [
      ['DOC.replyCount', 'DESC'],
      ['DOC.createdAt', 'ASC'],
    ]);
    expect(order).toHaveLength(2);
    expect(flattenSql(order?.[0])).toContain('::text');

    const groupOrder = sortToSqlOrderBy('groups', groupsTable, [
      ['lastPostAt', 'DESC'],
    ]);
    expect(groupOrder).toHaveLength(1);
  });
});

describe('map post-filter sort and limit', () => {
  const docs = [
    { id: 'a', createdAt: '2026-01-01', score: 1 },
    { id: 'b', createdAt: '2026-03-01', score: 3 },
    { id: 'c', createdAt: '2026-02-01', score: 2 },
  ];

  it('applies match and string post-filters', () => {
    expect(
      applyPostFilters(docs, [{ matches: { id: 'b' } }]).map((d) => d.id),
    ).toEqual(['b']);
    expect(applyPostFilters(docs, ['DOC.score > 1']).map((d) => d.id)).toEqual([
      'b',
      'c',
    ]);
  });

  it('sorts and limits in memory', () => {
    expect(
      applySort(docs, [['DOC.createdAt', 'DESC']]).map((d) => d.id),
    ).toEqual(['b', 'c', 'a']);
    expect(applyLimit(docs, 2).map((d) => d.id)).toEqual(['a', 'b']);
    expect(applyLimit(docs, [1, 1]).map((d) => d.id)).toEqual(['b']);
  });

  it('addFilter appends only when a filter is provided', () => {
    const base = { collection: 'posts', filters: [] as never[] };
    expect(addFilter(base).filters).toEqual([]);
    expect(addFilter(base, { matches: { id: '1' } }).filters).toHaveLength(1);
  });
});
