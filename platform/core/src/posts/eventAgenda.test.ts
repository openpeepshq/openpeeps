import { describe, expect, it, vi } from 'vitest';

vi.mock('bcrypt', () => ({ compare: vi.fn(), hash: vi.fn() }));
import { QueryBuilder } from 'drizzle-orm/pg-core';
import { eventAgendaOccurrenceQuery } from './eventAgenda';

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

  it('filters upcoming occurrences to exclude ended ones', () => {
    const query = toSql('upcoming');

    // Semantic check rather than exact SQL formatting: the predicate is
    // COALESCE(end, start + interval '1 hour') >= now.
    expect(query.sql).toContain('COALESCE');
    expect(query.sql).toContain("interval '1 hour'");
    expect(query.sql).toMatch(/coalesce\(.+\) >= /i);
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
