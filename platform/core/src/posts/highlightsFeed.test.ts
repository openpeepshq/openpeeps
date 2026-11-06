import { describe, expect, it } from 'vitest';
import type { SQLWrapper } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { highlightsFeed } from './finders';
import { partitionFilters } from '../db/pg/map/filters';
import { getTableForCollection } from '../db/pg/map/registry';

const dialect = new PgDialect();

// Rendered text plus params, so assertions can match both column
// references and bound literals.
const flattenSql = (value: unknown): string => {
  if (value == null) return '';
  const query = dialect.sqlToQuery((value as SQLWrapper).getSQL());
  return `${query.sql} ${JSON.stringify(query.params)}`;
};

const postsTable = getTableForCollection('posts');

describe('highlightsFeed', () => {
  it('orders by curation time, not conversation activity', () => {
    expect(highlightsFeed({}).data().sort).toEqual([
      ['highlightedAt', 'DESC'],
      ['id', 'DESC'],
    ]);
  });

  it('keeps the highlighted and community-visibility gates in SQL', () => {
    const { sqlWhere, postFilters: remaining } = partitionFilters(
      'posts',
      postsTable,
      highlightsFeed({}).data().filters,
    );

    const rendered = flattenSql(sqlWhere);
    expect(rendered).toContain('"posts"."highlighted"');
    // A highlighted direct/group/followers post must never leak into the
    // feed, so the visibility gate has to be enforced in the query itself.
    expect(rendered).toContain('"posts"."visibility"');
    expect(rendered).toContain('local');
    expect(rendered).toContain('public');
    // Nothing may fall through to post-hydration filtering: with offset
    // pagination a JS-side filter would break page boundaries.
    expect(remaining).toEqual([]);
  });

  it('excludes replies in threaded format but includes them in linear', () => {
    const sqlFor = (format: 'threaded' | 'linear') =>
      flattenSql(
        partitionFilters(
          'posts',
          postsTable,
          highlightsFeed({ format }).data().filters,
        ).sqlWhere,
      );
    expect(sqlFor('threaded')).toContain('NOT EXISTS');
    expect(sqlFor('linear')).not.toContain('NOT EXISTS');
  });
});
