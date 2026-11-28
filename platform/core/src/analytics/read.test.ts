import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  AnalyticsGrowth,
  AnalyticsOnboarding,
  AnalyticsOverview,
} from '@openpeepshq/common/types';
import pg from 'pg';
import { empty } from '../db';
import { closePostgres, pgConnectionString, pgPool } from '../db/pg/client';
import { closeRedisConnections } from '../redis';
import { invalidateAnalyticsCache } from './cache';
import { eachUtcDay } from './dateRange';
import {
  exportAnalyticsCsv,
  getAnalyticsGrowth,
  getAnalyticsOnboarding,
  getAnalyticsOverview,
} from './read';

const FROM = '2026-08-01';
const TO = '2026-08-07';
const PREV_FROM = '2026-07-25';
const PREV_TO = '2026-07-31';

const currentDays = eachUtcDay(FROM, TO);
const prevDays = eachUtcDay(PREV_FROM, PREV_TO);

// Daily rollup values for the current period (2026-08-01..2026-08-07)
const CURRENT_ACTIVE = [5, 5, 10, 10, 15, 15, 20];
const CURRENT_POSTS = [10, 20, 30, 40, 50, 60, 70];
// new_members rollups: only 2026-08-03 (index 2) has signups, so the growth
// newSignups card (loadTotalsSeries('newMembers') -> sumSeries) has a
// non-zero value to pin.
const CURRENT_NEW = [0, 0, 2, 0, 0, 0, 0];
// Daily rollup values for the previous period (2026-07-25..2026-07-31)
const PREV_ACTIVE = 10;
const PREV_POSTS = 100;
// new_members for the previous period: only 2026-07-28 (index 3) has signups
const PREV_NEW = [0, 0, 0, 1, 0, 0, 0];

// Active members are measured by countDistinctActives (read.ts), which counts
// distinct actor profiles from the activity tables joined to local, non-deleted
// profiles. The posts below use real seeded profile ids as creators so those
// actors are counted; the analytics_daily_totals.active_members rollups drive
// the series/chart independently.

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
      `INSERT INTO analytics_daily_totals (day, active_members, posts, new_members)
       VALUES ($1, $2, $3, $4)`,
      [currentDays[i], CURRENT_ACTIVE[i], CURRENT_POSTS[i], CURRENT_NEW[i]],
    );
  }

  // analytics_daily_totals — previous period rollups
  for (let i = 0; i < prevDays.length; i++) {
    await pool.query(
      `INSERT INTO analytics_daily_totals (day, active_members, posts, new_members)
       VALUES ($1, $2, $3, $4)`,
      [prevDays[i], PREV_ACTIVE, PREV_POSTS, PREV_NEW[i]],
    );
  }

  // profiles: 3 on Jul 20, 4 on Jul 28, 3 on Aug 3, + 1 edge-boundary local
  // member on Aug 7 (last microsecond of the range-end day) — all local
  // plus 2 guest profiles on Jul 25 (should be excluded from member counts)
  // plus accounts linked via controls edge: first 7 verified, last 3
  // unverified, + the edge-boundary member linked to one verified and one
  // unverified account (pins both cards to the exclusive boundary)
  // totalMembers@07-31 = 7 (3+4), totalMembers@08-07 = 11 (3+4+3+1 edge-boundary)
  // verifiedMembers@07-31 = 7, verifiedMembers@08-07 = 8 (7 + edge-boundary)
  // unverifiedMembers@07-31 = 0, unverifiedMembers@08-07 = 4 (3 + edge-boundary)
  const profileDates = ['2026-07-20', '2026-07-28', '2026-08-03'];
  const profileCounts = [3, 4, 3];
  const createdProfileIds: string[] = [];
  for (let d = 0; d < profileDates.length; d++) {
    for (let i = 0; i < profileCounts[d]; i++) {
      const res = await pool.query(
        `INSERT INTO profiles (id, handle, type, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'local', $2, $2)
         RETURNING id`,
        [`seed-profile-${d}-${i}`, `${profileDates[d]}T00:00:00.000Z`],
      );
      createdProfileIds.push(...res.rows.map((r: { id: string }) => r.id));
    }
  }

  // Guest profiles must not be counted in member totals
  const guest1Res = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'guest-1', 'guest', $1, $1)
     RETURNING id`,
    ['2026-07-25T00:00:00.000Z'],
  );
  const guest1Id = guest1Res.rows[0].id;
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'guest-2', 'guest', $1, $1)`,
    ['2026-07-25T00:00:00.000Z'],
  );

  // Link an account (verified or unverified) to each local profile via controls edge
  for (let i = 0; i < createdProfileIds.length; i++) {
    const profileId = createdProfileIds[i];
    const emailValidated = i < 7;
    const dateIdx = i < 3 ? 0 : i < 7 ? 1 : 2;
    const accountRes = await pool.query(
      `INSERT INTO accounts (id, email, password_hash, email_validated, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'hash', $2, $3, $3)
       RETURNING id`,
      [`user${i}@example.com`, emailValidated, profileDates[dateIdx]],
    );
    const accountId = accountRes.rows[0].id;
    await pool.query(
      `INSERT INTO controls (id, from_id, to_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
      [accountId, profileId, profileDates[dateIdx]],
    );
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

  // posts: 5 on Aug 3 by 5 distinct local members (indices 5..9) + the
  // edge-boundary member's Aug 7 post (see below) → 6 distinct local members
  // active in the current window;
  // 3 on Jul 28 by 3 distinct local members (indices 0..2) → prevActiveMembers=3,
  // all public visibility. Creators reference real seeded local profiles so
  // countDistinctActives (which joins to local, non-deleted profiles) counts them.
  // allTimePosts@07-31 = 3, allTimePosts@08-07 = 11 (the fed-1 08-04 post and the
  // gone-1 08-05 post are deliberately counted toward posts)
  for (let i = 0; i < 3; i++) {
    await pool.query(
      `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
      [createdProfileIds[i], '2026-07-28T00:00:00.000Z'],
    );
  }
  for (let i = 5; i < 10; i++) {
    await pool.query(
      `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
      [createdProfileIds[i], '2026-08-03T00:00:00.000Z'],
    );
  }

  // Non-member actors who post in the current window. Neither may be counted
  // in active members: federated profiles are not local members, and a deleted
  // local profile is excluded from the member population. Both would inflate
  // the count (and could push it past totalMembers) without the scope join.
  const fedRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'fed-1', 'federated', $1, $1)
     RETURNING id`,
    ['2026-08-02T00:00:00.000Z'],
  );
  const fedId = fedRes.rows[0].id;
  await pool.query(
    `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
     VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
    [fedId, '2026-08-04T00:00:00.000Z'],
  );

  const deletedRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at, deleted_at)
     VALUES (gen_random_uuid(), 'gone-1', 'local', $1, $1, $2)
     RETURNING id`,
    ['2026-07-20T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
  );
  // Deleting a profile in the app may also remove its accounts/controls edges;
  // here the profile row is seeded with deleted_at directly and left intact
  // on purpose — the scope join must not depend on those joined tables, so the
  // idealized seed keeps that property under test.
  const deletedId = deletedRes.rows[0].id;
  await pool.query(
    `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
     VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
    [deletedId, '2026-08-05T00:00:00.000Z'],
  );

  // Non-member activity through a non-post union branch: guest-1 (a guest
  // profile, seeded above with no posts) bookmarks a post inside the window.
  // Its only activity is this bookmark, so it enters the active-members union
  // exclusively through the bookmarks branch. Under localMemberScope it is not
  // a local member and must not be counted (activeMembers stays 6); if the
  // bookmarks branch ever dropped the scope join, guest-1 would leak in and
  // the exact activeMembers assertion below would fail (7 instead of 6).
  const targetPostRes = await pool.query(
    `SELECT id FROM posts ORDER BY created_at LIMIT 1`,
  );
  await pool.query(
    `INSERT INTO bookmarks (id, from_id, to_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
    [guest1Id, targetPostRes.rows[0].id, '2026-08-06T00:00:00.000Z'],
  );

  // Boundary pin: a local member created in the last microsecond of the
  // range-end day (TO = 2026-08-07). totalMembersAt must use the exclusive
  // next-day boundary (`created_at < 2026-08-08T00:00:00.000Z`) to count it —
  // the old inclusive `<= 2026-08-07T23:59:59.999Z` would miss the .999999
  // fraction. The member also posts within the window, so they are counted on
  // the active-members side too; together they pin the active <= total
  // invariant at range end (before the fix, the total undercounted the
  // boundary member while the active side still counted them).
  const edgeRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'edge-boundary', 'local', $1, $1)
     RETURNING id`,
    ['2026-08-07T23:59:59.999999Z'],
  );
  const edgeId = edgeRes.rows[0].id;
  await pool.query(
    `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
     VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
    [edgeId, '2026-08-07T12:00:00.000Z'],
  );

  // Link the boundary member to two accounts so the verified/unverified
  // members cards and the recent-signups list are all pinned to the same
  // exclusive next-day boundary: a .999999 creation instant falls after
  // `<= 23:59:59.999Z`, so these queries would all undercount by one without
  // the alignment. One account is unverified (drives the unverified card from
  // 3 to 4) and one is verified (drives the verified card from 7 to 8), so a
  // revert of either card to the inclusive bound fails the suite.
  const edgeAccountRes = await pool.query(
    `INSERT INTO accounts (id, email, password_hash, email_validated, created_at, updated_at)
     VALUES (gen_random_uuid(), 'edge@example.com', 'hash', false, $1, $1)
     RETURNING id`,
    ['2026-08-07T23:59:59.999999Z'],
  );
  await pool.query(
    `INSERT INTO controls (id, from_id, to_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
    [edgeAccountRes.rows[0].id, edgeId, '2026-08-07T23:59:59.999999Z'],
  );
  const edgeVerifiedAccountRes = await pool.query(
    `INSERT INTO accounts (id, email, password_hash, email_validated, created_at, updated_at)
     VALUES (gen_random_uuid(), 'edge-verified@example.com', 'hash', true, $1, $1)
     RETURNING id`,
    ['2026-08-07T23:59:59.999999Z'],
  );
  await pool.query(
    `INSERT INTO controls (id, from_id, to_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
    [edgeVerifiedAccountRes.rows[0].id, edgeId, '2026-08-07T23:59:59.999999Z'],
  );
};

// Integration tests require a real PostgreSQL instance.
// The CI `test-unit` job provides postgres:16-alpine + redis and a DATABASE_URL
// (.forgejo/workflows/build.yaml), so these suites run for real there; the
// graceful skip only covers bare-container CI jobs (lint, commit-check, …)
// and local runs without a database. connect_timeout bounds the probe so a
// slow-to-refuse server cannot hang the worker (parity with
// conversationQueries.test.ts).
const hasPostgres = await (async () => {
  const client = new pg.Client({
    connectionString: pgConnectionString(),
    connect_timeout: 2,
  });
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
  let growth: AnalyticsGrowth;

  beforeEach(async () => {
    await empty();
    try {
      // node-redis connect() retries forever when the host is unreachable
      // and never rejects; bound the wait so a missing Redis degrades to a
      // cache miss instead of hanging the hook.
      await Promise.race([
        invalidateAnalyticsCache(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Redis may be unavailable in the test environment; the cache layer
      // treats connection failures as cache misses and recomputes from DB.
    }
    await seed();
    overview = await getAnalyticsOverview({ from: FROM, to: TO });
    growth = await getAnalyticsGrowth({ from: FROM, to: TO });
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
    expect(card.value).toBe(11);
    expect(card.previousValue).toBe(3);
    expect(card.deltaPct).toBe(266.7);
  });

  it('returns totalMembers as cumulative count through range end', () => {
    // 10 local members from profileDates + the edge-boundary member created at
    // the last microsecond of the range-end day (counted only via the exclusive
    // next-day boundary in totalMembersAt).
    const card = overview.metrics.totalMembers;
    expect(card.value).toBe(11);
    expect(card.previousValue).toBe(7);
    expect(card.deltaPct).toBe(57.1);
  });

  it('excludes guest profiles from totalMembers', () => {
    // 2 guest profiles were seeded on Jul 25; they must not inflate the count.
    // totalMembers@08-07 = 11 (local only, incl. edge-boundary), previous@07-31 = 7 (local only)
    const card = overview.metrics.totalMembers;
    expect(card.value).toBe(11);
    expect(card.previousValue).toBe(7);
  });

  it('returns verified members as all verified profiles through range end', () => {
    // 7 seeded Jul verified accounts + the edge-boundary member's verified
    // account (created at 23:59:59.999999Z, only visible to the exclusive
    // next-day bound). The value 8 — up from 7 at the previous period end —
    // pins the verified card's boundary alignment: reverting verifiedMembersAt
    // to the inclusive `<= 23:59:59.999Z` bound would read 7 and fail here.
    const card = overview.metrics.verifiedMembers;
    expect(card.value).toBe(8);
    expect(card.previousValue).toBe(7);
    expect(card.deltaPct).toBe(14.3);
  });

  it('returns unverified members as all unverified profiles through range end', () => {
    // 3 seeded Aug 3 accounts + the edge-boundary member (created at
    // 23:59:59.999999Z, only visible to the exclusive next-day bound).
    const card = overview.metrics.unverifiedMembers;
    expect(card.value).toBe(4);
    expect(card.previousValue).toBe(0);
    expect(card.deltaPct).toBeNull();
  });

  it('includes the range-end boundary member in recent signups', () => {
    // The edge-boundary member (Aug 7, 23:59:59.999999Z) is inside the range
    // only via the exclusive next-day bound (created_at < exclusiveEnd(range.to));
    // the old inclusive `<= range.toT23:59:59.999Z` would have dropped it, so its
    // presence pins the signups boundary alignment.
    const handles = growth.recentSignups.map((r) => r.handle);
    expect(handles).toContain('edge-boundary');
  });

  it('returns totalGroups as cumulative count through range end', () => {
    const card = overview.metrics.totalGroups;
    expect(card.value).toBe(5);
    expect(card.previousValue).toBe(2);
    expect(card.deltaPct).toBe(150);
  });

  it('returns activeMembers as a distinct count from activity tables', () => {
    // read.ts computes activeMembers via countDistinctActives() instead of
    // sumSeries(activeMembersSeries) (the "refactor(analytics): update active
    // members calculation and descriptions" change on main).
    // The value is a true distinct count of members who posted, liked,
    // replied, reposted, or bookmarked in the window — not a sum of daily
    // rollups. The series still holds the daily active_members rollups
    // for chart display. The 6th distinct member is the edge-boundary member
    // (joined at range end, posted in the window), so the count pins the
    // active <= total invariant together with the 11 totalMembers above.
    // guest-1's in-window bookmark (a non-post union branch) is excluded by
    // the scope, so it must not add a 7th active — a dropped bookmarks-branch
    // scope would leak it in and fail this exact assertion.
    const card = overview.metrics.activeMembers;
    expect(card.value).toBe(6);
    expect(card.previousValue).toBe(3);
    expect(card.deltaPct).toBe(100);
    // Series is independent of the distinct-count value.
    expect(card.series?.map((p) => p.value)).toEqual(CURRENT_ACTIVE);
    expect(card.series?.length).toBe(7);
  });

  it('pins growth MAU to the distinct members active in the rolling 30-day window', () => {
    // MAU uses the same countDistinctActives as the activeMembers card but over
    // a rolling 30-day window ending at range.to: [2026-07-09, 2026-08-08).
    // The window spans the whole current-period seed, so the distinct local
    // non-deleted posters are: 3 (Jul 28, profiles 0-2) + 5 (Aug 3, profiles
    // 5-9) + 1 (edge-boundary, Aug 7) = 9. Federated (fed-1) and deleted
    // (gone-1) posters are excluded by localMemberScope. The previous window
    // [2026-07-02, 2026-08-01) only captures the 3 Jul-28 posters.
    const card = growth.metrics.mau;
    expect(card.value).toBe(9);
    expect(card.previousValue).toBe(3);
    expect(card.deltaPct).toBe(200);
  });

  it('pins growth DAU to the mean of the daily active_members rollups', () => {
    // DAU is the mean of the current-period active_members rollups
    // (CURRENT_ACTIVE) and, for the previous period, the mean of the flat
    // PREV_ACTIVE=10 series — independent of the distinct-count MAU above.
    const card = growth.metrics.dau;
    expect(card.value).toBe(11.4);
    expect(card.previousValue).toBe(10);
    expect(card.deltaPct).toBe(14);
  });

  it('pins growth DAU/MAU stickiness as a percentage of DAU over MAU', () => {
    // dauMau = round((dau / mau) * 1000) / 10. With dau=11.4 and mau=9 that is
    // 126.7 (DAU can exceed a single day's MAU because MAU is a distinct 30-day
    // count, not a single day's); previous period round((10/3)*1000)/10 = 333.3.
    const card = growth.metrics.dauMau;
    expect(card.value).toBe(126.7);
    expect(card.previousValue).toBe(333.3);
    expect(card.deltaPct).toBe(-62);
  });

  it('pins growth newSignups to the sum of the daily new_members rollups', () => {
    // newSignups = sumSeries(loadTotalsSeries('newMembers')) — the copy-through
    // of the daily new_members column, not a count of profiles. CURRENT_NEW
    // sums to 2 (only 2026-08-03 has signups); the previous-period sumColumn
    // over PREV_NEW is 1 (only 2026-07-28). deltaPct = round((2-1)/1*1000)/10
    // = 100. Without the new_members seed the column default (0) would pin the
    // copy-through to nothing, so this guards the sumColumn/sumSeries path the
    // other growth cards leave untested.
    const card = growth.metrics.newSignups;
    expect(card.value).toBe(2);
    expect(card.previousValue).toBe(1);
    expect(card.deltaPct).toBe(100);
    // Series carries the per-day new_members rollups (0 except the two seed days).
    expect(card.series?.map((p) => p.value)).toEqual(CURRENT_NEW);
  });
});

// Onboarding funnel: derives the Welcome checklist completion state for the
// cohort of members created within the selected range. Unlike the overview /
// growth reads (which lean on daily rollups), this is a pure state read, so it
// needs no analytics_daily_totals seed — only the source tables the probes hit.
maybe('getAnalyticsOnboarding', () => {
  let onboarding: AnalyticsOnboarding;

  const seed = async () => {
    const pool = pgPool();
    const id = async (handle: string, ts: string) => {
      const res = await pool.query(
        `INSERT INTO profiles (id, handle, type, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'local', $2, $2)
         RETURNING id`,
        [handle, ts],
      );
      return res.rows[0].id as string;
    };
    const linkAccount = async (
      profileId: string,
      email: string,
      validated: boolean,
    ) => {
      const acc = await pool.query(
        `INSERT INTO accounts (id, email, password_hash, email_validated, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'hash', $2, $3, $3)
         RETURNING id`,
        [email, validated, '2026-08-03T00:00:00.000Z'],
      );
      await pool.query(
        `INSERT INTO controls (id, from_id, to_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
        [acc.rows[0].id, profileId, '2026-08-03T00:00:00.000Z'],
      );
    };
    const setBody = async (
      profileId: string,
      body: Record<string, unknown>,
    ) => {
      await pool.query(`UPDATE profiles SET body = $1 WHERE id = $2`, [
        JSON.stringify(body),
        profileId,
      ]);
    };
    const follow = async (fromId: string, toId: string) => {
      await pool.query(
        `INSERT INTO follows (id, from_id, to_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
        [fromId, toId, '2026-08-03T00:00:00.000Z'],
      );
    };
    const post = async (creatorId: string, visibility: string) => {
      const res = await pool.query(
        `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
         VALUES (gen_random_uuid(), 'note', $1, $2, $3, $3)
         RETURNING id`,
        [visibility, creatorId, '2026-08-03T00:00:00.000Z'],
      );
      return res.rows[0].id as string;
    };
    const replyTo = async (replyId: string, parentPostId: string) => {
      await pool.query(
        `INSERT INTO reply_to (id, from_id, to_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
        [replyId, parentPostId, '2026-08-03T00:00:00.000Z'],
      );
    };
    const joinGroup = async (profileId: string) => {
      const grp = await pool.query(
        `INSERT INTO groups (id, handle, created_at, updated_at)
         VALUES (gen_random_uuid(), 'onb-group', '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z')
         RETURNING id`,
      );
      await pool.query(
        `INSERT INTO user_groups (id, from_id, to_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
        [profileId, grp.rows[0].id, '2026-08-03T00:00:00.000Z'],
      );
    };

    // Cohort members are created 2026-08-03 (inside FROM..TO = 08-01..08-07).
    //
    // m1 — fully onboarded: verified account, complete profile body, a follow,
    //   a non-direct post, and a group membership. All five steps complete.
    const m1 = await id('onb-m1', '2026-08-03T00:00:00.000Z');
    await linkAccount(m1, 'onb-m1@example.com', true);
    await setBody(m1, {
      avatar: 'https://cdn.example.com/a1.png',
      bio: 'Hello world',
      header: 'https://cdn.example.com/h1.png',
    });
    await follow(m1, m1); // a self-follow still counts (from_id probe only)
    await post(m1, 'public');
    await joinGroup(m1);

    // m2 — unverified, incomplete profile, no follow, direct-only post, no group.
    //   Only counts against the post probe if that probe wrongly ignored
    //   visibility: it posts, but visibility 'direct' must NOT count.
    const m2 = await id('onb-m2', '2026-08-03T00:00:00.000Z');
    await linkAccount(m2, 'onb-m2@example.com', false);
    await setBody(m2, { avatar: 'https://cdn.example.com/a2.png' });
    await post(m2, 'direct');

    // m3 — verified + full profile, but no follow, no post, no group.
    const m3 = await id('onb-m3', '2026-08-03T00:00:00.000Z');
    await linkAccount(m3, 'onb-m3@example.com', true);
    await setBody(m3, {
      avatar: 'https://cdn.example.com/a3.png',
      bio: 'Hi',
      header: 'https://cdn.example.com/h3.png',
    });

    // m4 — reply-only poster: the first and only post is a public reply. It
    // shows up nowhere in the by-profile feed the Welcome checklist queries,
    // so the checklist step stays incomplete; the probe must mirror that and
    // NOT count this post. Pins the round-2 review item: the funnel counts
    // exactly what the checklist marks done.
    const m4 = await id('onb-m4', '2026-08-03T00:00:00.000Z');
    await linkAccount(m4, 'onb-m4@example.com', true);
    const parent = await post(m1, 'public');
    const reply = await post(m4, 'public');
    await replyTo(reply, parent);

    // Edge-boundary member created in the last microsecond of range end (TO).
    // Mirrors the totalMembersAt boundary pin: the exclusive next-day bound
    // (created_at < 08-08) must include it. Give it a verified account only.
    const edge = await id('onb-edge', '2026-08-07T23:59:59.999999Z');
    await linkAccount(edge, 'onb-edge@example.com', true);

    // Guest profile in range: must be excluded from the cohort.
    await pool.query(
      `INSERT INTO profiles (id, handle, type, created_at, updated_at)
       VALUES (gen_random_uuid(), 'onb-guest', 'guest', $1, $1)`,
      ['2026-08-03T00:00:00.000Z'],
    );
  };

  beforeEach(async () => {
    await empty();
    try {
      await Promise.race([
        invalidateAnalyticsCache(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Redis may be unavailable; the cache layer treats that as a miss.
    }
    await seed();
    onboarding = await getAnalyticsOnboarding({ from: FROM, to: TO });
  });

  afterAll(async () => {
    await closePostgres();
    await closeRedisConnections();
  });

  const step = (key: string) => onboarding.steps.find((s) => s.key === key)!;

  it('pins the cohort to local members created in range (incl. edge-boundary)', () => {
    // m1, m2, m3, m4 (Aug 3) + edge-boundary (Aug 7 .999999) = 5. The guest
    // profile is excluded. The boundary member is included only via the
    // exclusive next-day bound, so an inclusive `<= 08-07T23:59:59.999Z`
    // would read 4.
    expect(onboarding.cohortSize.value).toBe(5);
  });

  it('computes per-step completion counts and rates', () => {
    // email: m1, m3, m4, edge verified (m2 unverified) = 4 of 5 → 80%
    expect(step('email').count).toBe(4);
    expect(step('email').rate).toBe(80);
    // profile: m1, m3 full; m2 has only avatar; m4/edge none = 2 of 5 → 40%
    expect(step('profile').count).toBe(2);
    expect(step('profile').rate).toBe(40);
    // follow: only m1 = 1 of 5 → 20%
    expect(step('follow').count).toBe(1);
    expect(step('follow').rate).toBe(20);
    // post: m1's public post counts; m2's direct post must NOT (visibility);
    // m4's public post is a reply and must NOT (it would not surface in the
    // by-profile feed the Welcome checklist marks the step from) = 1 of 5 → 20%
    expect(step('post').count).toBe(1);
    expect(step('post').rate).toBe(20);
    // group: only m1 = 1 of 5 → 20%
    expect(step('group').count).toBe(1);
    expect(step('group').rate).toBe(20);
  });

  it('orders steps in Welcome checklist order (email, profile, follow, post, group)', () => {
    expect(onboarding.steps.map((s) => s.key)).toEqual([
      'email',
      'profile',
      'follow',
      'post',
      'group',
    ]);
  });

  it('counts completedAll as members completing all five steps', () => {
    // Only m1 completes all five; m3 lacks follow/post/group, m4 lacks
    // profile/follow/post/group, m2/edge lack most.
    expect(onboarding.completedAll.value).toBe(1);
  });
});

// Onboarding funnel — negative edge cases the main seed does not cover.
// Pins the three review-suggestion probes: a deleted-only post is not a first
// post, a deleted (soft-removed) verified account is not a verified account,
// and an empty-string profile field is not "set".
maybe('getAnalyticsOnboarding negative edges', () => {
  let onboarding: AnalyticsOnboarding;

  const seed = async () => {
    const pool = pgPool();
    const id = async (handle: string, ts: string, deleted = false) => {
      const res = await pool.query(
        `INSERT INTO profiles (id, handle, type, created_at, updated_at, deleted_at)
         VALUES (gen_random_uuid(), $1, 'local', $2, $2, $3)
         RETURNING id`,
        [handle, ts, deleted ? '2026-08-03T00:00:00.000Z' : null],
      );
      return res.rows[0].id as string;
    };
    const linkAccount = async (
      profileId: string,
      email: string,
      validated: boolean,
      accountDeleted = false,
    ) => {
      const acc = await pool.query(
        `INSERT INTO accounts
           (id, email, password_hash, email_validated, created_at, updated_at, deleted_at)
         VALUES (gen_random_uuid(), $1, 'hash', $2, $3, $3, $4)
         RETURNING id`,
        [
          email,
          validated,
          '2026-08-03T00:00:00.000Z',
          accountDeleted ? '2026-08-03T00:00:00.000Z' : null,
        ],
      );
      await pool.query(
        `INSERT INTO controls (id, from_id, to_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
        [acc.rows[0].id, profileId, '2026-08-03T00:00:00.000Z'],
      );
    };
    const setBody = async (
      profileId: string,
      body: Record<string, unknown>,
    ) => {
      await pool.query(`UPDATE profiles SET body = $1 WHERE id = $2`, [
        JSON.stringify(body),
        profileId,
      ]);
    };
    const post = async (creatorId: string, deleted = false) => {
      await pool.query(
        `INSERT INTO posts
           (id, type, visibility, creator_id, created_at, updated_at, deleted_at)
         VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2, $3)`,
        [
          creatorId,
          '2026-08-03T00:00:00.000Z',
          deleted ? '2026-08-03T00:00:00.000Z' : null,
        ],
      );
    };

    const ts = '2026-08-03T00:00:00.000Z';
    // na — only post is soft-deleted: must NOT count for the post step.
    const na = await id('onb-na', ts);
    await linkAccount(na, 'onb-na@example.com', true);
    await post(na, true);
    // nb — only linked account is soft-deleted: must NOT count for email.
    const nb = await id('onb-nb', ts);
    await linkAccount(nb, 'onb-nb@example.com', true, true);
    // nc — bio is the empty string (avatar + header set): NOT complete.
    const nc = await id('onb-nc', ts);
    await linkAccount(nc, 'onb-nc@example.com', true);
    await setBody(nc, {
      avatar: 'https://cdn.example.com/na.png',
      bio: '',
      header: 'https://cdn.example.com/nh.png',
    });
    // nd — only follow targets a deleted profile: must NOT count for follow.
    const nd = await id('onb-nd', ts);
    await linkAccount(nd, 'onb-nd@example.com', true);
    const deletedTarget = await id('onb-nd-target', ts, true);
    await pool.query(
      `INSERT INTO follows (id, from_id, to_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
      [nd, deletedTarget, ts],
    );
  };

  beforeEach(async () => {
    await empty();
    try {
      await Promise.race([
        invalidateAnalyticsCache(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Redis may be unavailable; the cache layer treats that as a miss.
    }
    await seed();
    onboarding = await getAnalyticsOnboarding({ from: FROM, to: TO });
  });

  const step = (key: string) => onboarding.steps.find((s) => s.key === key)!;

  it('excludes a soft-deleted only-post from the post step', () => {
    expect(onboarding.cohortSize.value).toBe(4);
    expect(step('post').count).toBe(0);
  });

  it('excludes a soft-deleted only-account from the email step', () => {
    // na/nc/nd keep their live verified accounts (3); nb's account is gone.
    expect(step('email').count).toBe(3);
  });

  it('does not count an empty-string profile field as set', () => {
    expect(step('profile').count).toBe(0);
  });

  it('does not count a follow to a deleted profile', () => {
    expect(step('follow').count).toBe(0);
  });
});

// Onboarding funnel — empty cohort: no profiles in the range at all. Pins the
// 0-cohort branch of the per-step rate computation and the all-zero steps the
// admin page's steps table renders when the cohort is empty.
maybe('getAnalyticsOnboarding empty cohort', () => {
  const emptyOnboarding = async () => {
    await empty();
    try {
      await Promise.race([
        invalidateAnalyticsCache(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Redis may be unavailable; the cache layer treats that as a miss.
    }
    return getAnalyticsOnboarding({ from: FROM, to: TO });
  };

  it('reports a zero cohort with all-zero steps and rates', async () => {
    const onboarding = await emptyOnboarding();
    expect(onboarding.cohortSize.value).toBe(0);
    expect(onboarding.completedAll.value).toBe(0);
    expect(onboarding.steps.map((s) => s.key)).toEqual([
      'email',
      'profile',
      'follow',
      'post',
      'group',
    ]);
    for (const step of onboarding.steps) {
      expect(step.count).toBe(0);
      expect(step.rate).toBe(0);
    }
  });
});

// Onboarding section of exportAnalyticsCsv: pins the section header, the
// cohort_size row, and the per-step rows (labels included) so the export
// cannot silently regress. The empty-DB state makes the expected values
// static: cohort 0, every step 0,0.
maybe('exportAnalyticsCsv onboarding section', () => {
  it('exports the onboarding section rows for the selected range', async () => {
    await empty();
    try {
      await Promise.race([
        invalidateAnalyticsCache(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Redis may be unavailable; the cache layer treats that as a miss.
    }
    const csv = await exportAnalyticsCsv({ from: FROM, to: TO });
    const lines = csv.split('\n');
    expect(lines).toContain('onboarding');
    const cohortIdx = lines.indexOf('cohort_size');
    expect(cohortIdx).toBeGreaterThan(-1);
    expect(lines[cohortIdx + 1]).toBe('0');
    const headerIdx = lines.indexOf('step,label,count,rate');
    expect(headerIdx).toBeGreaterThan(-1);
    const rows = lines.slice(headerIdx + 1, headerIdx + 6);
    expect(rows).toEqual([
      'email,Verify your email address,0,0',
      'profile,Add profile details,0,0',
      'follow,Connect with others,0,0',
      'post,Make first post,0,0',
      'group,Join a group,0,0',
    ]);
  });
});
