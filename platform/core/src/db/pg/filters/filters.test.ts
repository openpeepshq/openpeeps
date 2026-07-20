import { describe, expect, it } from 'vitest';
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
    expect(postFilters.creatorId('profile-id').kind).toBe('sql');
  });
});
