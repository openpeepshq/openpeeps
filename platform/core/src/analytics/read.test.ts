import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { AnalyticsOverview } from '@openpeepshq/common/types';
import pg from 'pg';
import { empty } from '../db';
import { closePostgres, pgConnectionString, pgPool } from '../db/pg/client';
import { closeRedisConnections } from '../redis';
import { invalidateAnalyticsCache } from './cache';
import { eachUtcDay } from './dateRange';
import { getAnalyticsOverview } from './read';

const FROM = '2026-08-01';
const TO = '2026-08-07';
const PREV_FROM = '2026-07-25';
const PREV_TO = '2026-07-31';

const currentDays = eachUtcDay(FROM, TO);
const prevDays = eachUtcDay(PREV_FROM, PREV_TO);

// Daily rollup values for the current period (2026-08-01..2026-08-07)
const CURRENT_ACTIVE = [5, 5, 10, 10, 15, 15, 20];
const CURRENT_POSTS = [10, 20, 30, 40, 50, 60, 70];
// Daily rollup values for the previous period (2026-07-25..2026-07-31)
const PREV_ACTIVE = 10;
const PREV_POSTS = 100;

// Fixed UUIDs so we can seed distinct creators for the distinct-active-count
// query in countDistinctActives (read.ts). Posts with these creator_ids drive
// the activeMembers metric value; the analytics_daily_totals.active_members
// rollups drive the series/chart instead.
const CURRENT_CREATOR_UUIDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
];
const PREV_CREATOR_UUIDS = [
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
];

/**
 * Seed the tables that getAnalyticsOverview reads for the overview metric
 * cards: analytics_daily_totals, profiles, groups, posts.
 *
 * All other tables (reactions, reply_to, repost, bookmarks, post_seen,
 * user_groups, analytics_post_views_daily, analytics_daily_by_group, …)
 * are left empty — their queries return empty arrays gracefully.
 */
const seed = async () => {
  const pool = pgPool();

  // analytics_daily_totals — current period rollups
  for (let i = 0; i < currentDays.length; i++) {
    await pool.query(
      `INSERT INTO analytics_daily_totals (day, active_members, posts)
       VALUES ($1, $2, $3)`,
      [currentDays[i], CURRENT_ACTIVE[i], CURRENT_POSTS[i]],
    );
  }

  // analytics_daily_totals — previous period rollups
  for (const day of prevDays) {
    await pool.query(
      `INSERT INTO analytics_daily_totals (day, active_members, posts)
       VALUES ($1, $2, $3)`,
      [day, PREV_ACTIVE, PREV_POSTS],
    );
  }

  // profiles: 3 on Jul 20, 4 on Jul 28, 3 on Aug 3
  // totalMembers@07-31 = 7 (3+4), totalMembers@08-07 = 10 (3+4+3)
  const profileDates = ['2026-07-20', '2026-07-28', '2026-08-03'];
  const profileCounts = [3, 4, 3];
  for (let d = 0; d < profileDates.length; d++) {
    for (let i = 0; i < profileCounts[d]; i++) {
      await pool.query(
        `INSERT INTO profiles (id, handle, type, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'local', $2, $2)`,
        [`seed-profile-${d}-${i}`, `${profileDates[d]}T00:00:00.000Z`],
      );
    }
  }

  // groups: 2 on Jul 20, 3 on Aug 3
  // totalGroups@07-31 = 2, totalGroups@08-07 = 5
  const groupDates = ['2026-07-20', '2026-08-03'];
  const groupCounts = [2, 3];
  for (let d = 0; d < groupDates.length; d++) {
    for (let i = 0; i < groupCounts[d]; i++) {
      await pool.query(
        `INSERT INTO groups (id, handle, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $2)`,
        [`seed-group-${d}-${i}`, `${groupDates[d]}T00:00:00.000Z`],
      );
    }
  }

  // posts: 5 on Aug 3 (5 distinct creators → activeMembers=5), 3 on Jul 28
  // (3 distinct creators → prevActiveMembers=3), all public visibility
  // allTimePosts@07-31 = 3, allTimePosts@08-07 = 8
  for (let i = 0; i < PREV_CREATOR_UUIDS.length; i++) {
    await pool.query(
      `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
      [PREV_CREATOR_UUIDS[i], '2026-07-28T00:00:00.000Z'],
    );
  }
  for (let i = 0; i < CURRENT_CREATOR_UUIDS.length; i++) {
    await pool.query(
      `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
      [CURRENT_CREATOR_UUIDS[i], '2026-08-03T00:00:00.000Z'],
    );
  }
};

// Integration tests require a real PostgreSQL instance.
// CI unit-test jobs run without Postgres — skip gracefully there.
const hasPostgres = await (async () => {
  const client = new pg.Client({ connectionString: pgConnectionString() });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
})();

const maybe = hasPostgres ? describe : describe.skip;

maybe('getAnalyticsOverview', () => {
  let overview: AnalyticsOverview;

  beforeEach(async () => {
    await empty();
    try {
      await invalidateAnalyticsCache();
    } catch {
      // Redis may be unavailable in the test environment; the cache layer
      // treats connection failures as cache misses and recomputes from DB.
    }
    await seed();
    overview = await getAnalyticsOverview({ from: FROM, to: TO });
  });

  afterAll(async () => {
    await closePostgres();
    await closeRedisConnections();
  });

  it('resolves the requested date range and previous period', () => {
    expect(overview.range.from).toBe(FROM);
    expect(overview.range.to).toBe(TO);
    expect(overview.range.previousFrom).toBe(PREV_FROM);
    expect(overview.range.previousTo).toBe(PREV_TO);
  });

  it('returns totalPosts metric card summing daily rollups', () => {
    const card = overview.metrics.totalPosts;
    expect(card.value).toBe(280);
    expect(card.previousValue).toBe(700);
    expect(card.deltaPct).toBe(-60);
  });

  it('returns allTimePosts as cumulative count through range end', () => {
    const card = overview.metrics.allTimePosts;
    expect(card.value).toBe(8);
    expect(card.previousValue).toBe(3);
    expect(card.deltaPct).toBe(166.7);
  });

  it('returns totalMembers as cumulative count through range end', () => {
    const card = overview.metrics.totalMembers;
    expect(card.value).toBe(10);
    expect(card.previousValue).toBe(7);
    expect(card.deltaPct).toBe(42.9);
  });

  it('returns totalGroups as cumulative count through range end', () => {
    const card = overview.metrics.totalGroups;
    expect(card.value).toBe(5);
    expect(card.previousValue).toBe(2);
    expect(card.deltaPct).toBe(150);
  });

  it('returns activeMembers as a distinct count from activity tables', () => {
    // Since main (385bc03c), read.ts computes activeMembers via
    // countDistinctActives() instead of sumSeries(activeMembersSeries).
    // The value is a true distinct count of members who posted, liked,
    // replied, reposted, or bookmarked in the window — not a sum of daily
    // rollups. The series still holds the daily active_members rollups
    // for chart display.
    const card = overview.metrics.activeMembers;
    expect(card.value).toBe(5);
    expect(card.previousValue).toBe(3);
    expect(card.deltaPct).toBe(66.7);
    // Series is independent of the distinct-count value.
    expect(card.series?.map((p) => p.value)).toEqual(CURRENT_ACTIVE);
    expect(card.series?.length).toBe(7);
  });
});
