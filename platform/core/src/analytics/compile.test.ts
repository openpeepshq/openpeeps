import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { empty } from '../db';
import { closePostgres, pgConnectionString, pgPool } from '../db/pg/client';
import { compileAnalyticsDay } from './compile';

// The day under test. compileAnalyticsDay computes a single UTC calendar day's
// rollup, so one day is enough to exercise the active_members query.
const DAY = '2026-08-03';

/**
 * Seed exactly two live local members — only one of them active in the window —
 * plus three non-member actors (federated, deleted-local, guest) that are all
 * active. Before the scope fix the active_members rollup counted every actor
 * with activity (no profiles join), so the chart would show 4+ actives against
 * a member population of 2. After the fix only the active live local member is
 * counted, so the exact assertion below detects a dropped or broken scope:
 * if the federated/deleted/guest actors leaked back into the counted set the
 * count would exceed 1, and the invariant holds against the statically known
 * population (2) rather than a query re-derived from the same seed.
 *
 * Each non-member is active through two union branches: the member and the
 * federated + deleted actors via posts, the guest via a bookmark, so the scope
 * is pinned on more than the posts branch (a broken join only for the non-post
 * branches — entries/repost/reply_to/bookmarks — would still fail the rollup).
 */
const seed = async () => {
  const pool = pgPool();

  const memberRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'member-1', 'local', $1, $1)
     RETURNING id`,
    ['2026-07-01T00:00:00.000Z'],
  );
  const memberId = memberRes.rows[0].id;

  // Second live local member: part of the member population, but posts nothing
  // in the window — active_members must stay strictly below the population.
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'member-2', 'local', $1, $1)`,
    ['2026-07-01T00:00:00.000Z'],
  );

  const fedRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'fed-1', 'federated', $1, $1)
     RETURNING id`,
    ['2026-07-01T00:00:00.000Z'],
  );
  const fedId = fedRes.rows[0].id;

  const deletedRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at, deleted_at)
     VALUES (gen_random_uuid(), 'gone-1', 'local', $1, $1, $2)
     RETURNING id`,
    ['2026-07-01T00:00:00.000Z', '2026-07-15T00:00:00.000Z'],
  );
  // Deleting a profile in the app may also remove its accounts/controls edges;
  // here the profile row is seeded with deleted_at directly and left intact
  // on purpose — the scope join must not depend on those joined tables, so the
  // idealized seed keeps that property under test.
  const deletedId = deletedRes.rows[0].id;

  const guestRes = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'guest-1', 'guest', $1, $1)
     RETURNING id`,
    ['2026-07-01T00:00:00.000Z'],
  );
  const guestId = guestRes.rows[0].id;

  // One post each by the member, the federated, and the deleted actors, all in
  // the window. The guest is deliberately kept out of posts: it is active only
  // through the bookmark below, so the non-post union branch is exercised too.
  for (const actorId of [memberId, fedId, deletedId]) {
    await pool.query(
      `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
      [actorId, '2026-08-03T06:00:00.000Z'],
    );
  }
  // The guest bookmarks the member's post in the window (the post is the
  // bookmark target). If the bookmarks branch of the active_members union ever
  // stopped applying localMemberScope, the guest would leak in and the rollup
  // would exceed 1 even though only the member and the two posting non-members
  // are active through posts.
  const memberPostRes = await pool.query(
    `SELECT id FROM posts WHERE creator_id = $1 LIMIT 1`,
    [memberId],
  );
  await pool.query(
    `INSERT INTO bookmarks (id, from_id, to_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $3)`,
    [guestId, memberPostRes.rows[0].id, '2026-08-03T09:00:00.000Z'],
  );
  // A second same-day post by the member — still one distinct active member.
  await pool.query(
    `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
     VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
    [memberId, '2026-08-03T12:00:00.000Z'],
  );
};

// Integration tests require a real PostgreSQL instance.
// The CI `test-unit` job provides postgres:16-alpine + redis and a DATABASE_URL
// (.forgejo/workflows/build.yaml), so these suites run for real there; the
// graceful skip only covers bare-container CI jobs (lint, commit-check, …)
// and local runs without a database.
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

maybe('compileAnalyticsDay', () => {
  afterAll(async () => {
    await closePostgres();
  });

  it('scopes the active_members rollup to live local members', async () => {
    await empty();
    await seed();
    await compileAnalyticsDay(DAY);

    const pool = pgPool();
    const totals = await pool.query(
      `SELECT active_members, posts, new_members FROM analytics_daily_totals
       WHERE day = $1`,
      [DAY],
    );
    expect(totals.rows).toHaveLength(1);
    const row = totals.rows[0] as {
      active_members: number;
      posts: number;
      new_members: number;
    };

    // Only the single active live local member is counted — the federated,
    // deleted, and guest actors are excluded by the profiles join (the guest
    // through the bookmarks branch, the other two through the posts branch),
    // and the second live member is not active at all. A broken scope (join
    // dropped, or applied to the wrong population) would count the three
    // non-member actors and land on 4.
    expect(Number(row.active_members)).toBe(1);

    // The invariant the whole fix is for: the series value (active_members)
    // must not exceed the total-member population. The population is asserted
    // as a literal seeded into the database (2) so the invariant does not
    // compare the rollup against a query re-derived from the same seed — that
    // comparison could never fail once the exact match above passes.
    expect(Number(row.active_members)).toBeLessThanOrEqual(2);

    // Sanity: the rollup ran over the window (all 4 public posts in the day,
    // regardless of author — the guest's activity is its bookmark, not a post).
    expect(Number(row.posts)).toBe(4);
    // No profile was created on the target day, so new_members stays 0.
    expect(Number(row.new_members)).toBe(0);
  });
});

maybe('compileAnalyticsDay profile_views rollup (#802)', () => {
  afterAll(async () => {
    await closePostgres();
  });

  const seedProfileSeen = async () => {
    const pool = pgPool();
    // Two distinct viewers view profile A twice on DAY, and a single viewer
    // views profile B once. A view from outside DAY must be ignored, as must a
    // view of a third profile (only A and B get rows).
    await pool.query(
      `INSERT INTO profile_seen (id, from_id, to_id, body, created_at, updated_at)
       VALUES
         (gen_random_uuid(), 'v1', 'A', '{}', $1, $1),
         (gen_random_uuid(), 'v2', 'A', '{}', $2, $2),
         (gen_random_uuid(), 'v1', 'A', '{}', $3, $3),
         (gen_random_uuid(), 'v3', 'B', '{}', $1, $1),
         (gen_random_uuid(), 'v4', 'A', '{}', $4, $4)`,
      [
        '2026-08-03T01:00:00.000Z',
        '2026-08-03T02:00:00.000Z',
        '2026-08-03T03:00:00.000Z',
        '2026-08-04T01:00:00.000Z',
      ],
    );
  };

  it('compiles unique viewers and view events per profile for the day', async () => {
    await empty();
    await seedProfileSeen();
    await compileAnalyticsDay(DAY);

    const pool = pgPool();
    const rows = (
      await pool.query(
        `SELECT profile_id, unique_viewers, view_events
         FROM analytics_profile_views_daily
         WHERE day = $1
         ORDER BY profile_id`,
        [DAY],
      )
    ).rows as {
      profile_id: string;
      unique_viewers: number;
      view_events: number;
    }[];

    // A: 3 impressions, 2 distinct viewers (v1 viewed twice). B: 1 impression,
    // 1 viewer. The out-of-day v4 row does not count toward A.
    expect(rows).toEqual([
      { profile_id: 'A', unique_viewers: 2, view_events: 3 },
      { profile_id: 'B', unique_viewers: 1, view_events: 1 },
    ]);
  });
});
