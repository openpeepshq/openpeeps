import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQLWrapper } from 'drizzle-orm';
import {
  combine,
  createdAtBetween,
  edgeFilters,
  eventTimeFilters,
  isSqlFilter,
  notificationFilters,
  postFilters,
  profileFilters,
} from './index';
import { entries } from '../schema/edges';

const dialect = new PgDialect();

const flattenSql = (value: SQLWrapper): string => {
  const query = dialect.sqlToQuery(value.getSQL());
  return `${query.sql} ${JSON.stringify(query.params)}`;
};

describe('pg filters', () => {
  it('wraps SQL in SqlFilter', () => {
    const filter = postFilters.notDirect();
    expect(isSqlFilter(filter)).toBe(true);
    expect(filter.where).toBeDefined();
  });

  it('builds compound filters with sql and legacy matchers', () => {
    const filter = combine.or(postFilters.hasJam(), {
      matches: { visibility: 'public' },
    });
    expect(filter).toEqual({
      operator: '||',
      predicates: [postFilters.hasJam(), { matches: { visibility: 'public' } }],
    });
  });

  it('builds createdAtBetween ranges', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-02-01T00:00:00.000Z');
    const filter = createdAtBetween(entries, start, end);
    expect(isSqlFilter(filter)).toBe(true);
    expect(filter?.where).toBeDefined();
  });

  it('exposes domain-specific helpers', () => {
    expect(profileFilters.notGuest().kind).toBe('sql');
    expect(notificationFilters.unseen().kind).toBe('sql');
    expect(edgeFilters.entryType('create').kind).toBe('sql');
    expect(eventTimeFilters.upcoming().kind).toBe('sql');
    expect(postFilters.replyCountZero().kind).toBe('sql');
    expect(postFilters.notReply().kind).toBe('sql');
    expect(postFilters.creatorId('profile-id').kind).toBe('sql');
  });

  it('excludes replies with a NOT EXISTS on reply_to', () => {
    const rendered = flattenSql(postFilters.notReply().where);
    expect(rendered).toContain('NOT EXISTS');
    expect(rendered).toContain('"reply_to"');
    expect(rendered).toContain('"from_id"');
  });

  it('builds my-feed membership and following checks entirely in SQL', () => {
    const rendered = flattenSql(
      postFilters.myFeed(
        'current-profile',
        ['followed-profile'],
        ['joined-group'],
      ).where,
    );

    expect(rendered).toContain('"posts"."creator_id"');
    expect(rendered).toContain('EXISTS (SELECT 1 FROM "post_groups"');
    expect(rendered).toContain('"posts"."id"::text');
    expect(rendered).toContain('"post_groups"."from_id"');
    expect(rendered).toContain('"post_groups"."to_id"');
    expect(rendered).toContain('current-profile');
    expect(rendered).toContain('followed-profile');
    expect(rendered).toContain('joined-group');
  });
});
