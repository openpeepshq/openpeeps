import { describe, expect, it } from 'vitest';
import { QueryBuilder } from 'drizzle-orm/pg-core';
import {
  eventAgendaOccurrenceQuery,
  eventRangeOccurrenceQuery,
} from './eventAgenda';

const queryBuilder = new QueryBuilder();

const toSql = (
  window: 'upcoming' | 'current' | 'past',
  extras: { groupId?: string; mine?: boolean; profileId?: string } = {},
) =>
  eventAgendaOccurrenceQuery(queryBuilder, {
    window,
    now: '2026-08-25T12:00:00.000Z',
    offset: 15,
    limit: 15,
    ...extras,
  }).toSQL();

describe('eventAgendaOccurrenceQuery', () => {
  it('picks one occurrence per event before paging upcoming rows', () => {
    const query = toSql('upcoming');

    expect(query.sql).toContain('distinct on ("event_occurrences"."post_id")');
    expect(query.sql).toMatch(
      /coalesce\("event_occurrences"\."end", "event_occurrences"\."start" \+ interval '1 hour'\) >= /i,
    );
    expect(query.sql).toMatch(
      /order by "event_occurrences"."post_id", "event_occurrences"."start"/i,
    );
    expect(query.sql).toMatch(/order by "event_agenda"."start"/i);
    expect(query.sql).toContain('limit $');
    expect(query.sql).toContain('offset $');
    expect(query.params).toContain(15);
  });

  it('treats a missing end as one hour after start for current events', () => {
    const query = toSql('current');

    expect(query.sql).toMatch(/interval '1 hour'/i);
    expect(query.sql).toMatch(
      /coalesce\("event_occurrences"\."end", "event_occurrences"\."start" \+ interval '1 hour'\)/i,
    );
  });

  it('uses the latest past occurrence when ranking past events', () => {
    const query = toSql('past');

    expect(query.sql).toMatch(
      /order by "event_occurrences"."post_id", "event_occurrences"."start" desc/i,
    );
    expect(query.sql).toMatch(/order by "event_agenda"."start" desc/i);
  });

  it('scopes group feeds with an exists check', () => {
    const query = toSql('upcoming', { groupId: 'group-1' });

    expect(query.sql.toLowerCase()).toContain(
      'exists (select 1 from "post_groups"',
    );
    expect(query.params).toContain('group-1');
  });
});

describe('eventRangeOccurrenceQuery', () => {
  const toRangeSql = (from = '2026-09-01T00:00:00.000Z') =>
    eventRangeOccurrenceQuery(queryBuilder, {
      from,
      to: '2026-10-05T00:00:00.000Z',
      offset: 15,
      limit: 15,
    }).toSQL();

  it('overlaps the window without a distinct on and orders by start', () => {
    const query = toRangeSql();

    expect(query.sql).not.toContain('distinct on');
    expect(query.sql).toMatch(/"event_occurrences"\."start" < \$\d+/i);
    expect(query.sql).toMatch(
      /coalesce\("event_occurrences"\."end", "event_occurrences"\."start" \+ interval '1 hour'\) >= \$\d+/i,
    );
    expect(query.sql).toMatch(/order by "event_occurrences"\."start"/i);
    expect(query.sql).not.toMatch(
      /order by "event_occurrences"\."start" desc/i,
    );
    expect(query.sql).toContain('limit $');
    expect(query.sql).toContain('offset $');
  });

  it('scopes mine with creator, moderator, and rsvp branches', () => {
    const query = eventRangeOccurrenceQuery(queryBuilder, {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-05T00:00:00.000Z',
      offset: 0,
      limit: 15,
      mine: true,
      profileId: 'profile-1',
    }).toSQL();

    expect(query.sql).toContain('creator_id');
    expect(query.sql.toLowerCase()).toContain("'rsvp'");
    expect(query.sql.toLowerCase()).toContain('jam');
  });
});
