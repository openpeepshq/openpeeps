import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, parseISO } from 'date-fns';
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
const seed = async (): Promise<{
  member1: string;
  member2: string;
  fed: string;
  deleted: string;
  guest: string;
}> => {
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
  const member2Res = await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES (gen_random_uuid(), 'member-2', 'local', $1, $1)
     RETURNING id`,
    ['2026-07-01T00:00:00.000Z'],
  );
  const member2Id = member2Res.rows[0].id;

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

  return {
    member1: memberId,
    member2: member2Id,
    fed: fedId,
    deleted: deletedId,
    guest: guestId,
  };
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

// Jam fixture for the daily-compile wiring: seeds the same session shape as
// the computeJamStats fixture in jamMetrics.test.ts, in addition to the
// minimal actor population the active_members seed builds. Expected daily
// values for DAY are hand-computed from this seed:
//  - jam_sessions 4: POST_J1 (recurring, occurrence J_OCC), POST_J2
//    (one-off, recurrence_id NULL → '' key), POST_J3 (midnight-spanning:
//    starts 23:30 on DAY, closes 00:15 the next day) and POST_J4 (open:
//    starts 10:25, never closes — its end is the pinned `now`). Distinct
//    (post, occurrence).
//  - jam_participants 3: member-1@J1, member-1@J2, member-2@J2 —
//    member-1's second join of J1 is a reconnect (collapsed), the guest
//    and the deleted local profile are excluded by the profiles join.
//  - jam_unique_attendees 2: member-1, member-2.
//  - jam_minutes 90: J1 10:00–10:30 (30), J2 10:20–10:35 (15), J3
//    23:30→00:15 next day (45, attributed to the start day). The open J4
//    contributes no minutes — an open session has no settled duration — but it
//    does carry the `now`-capped concurrency interval below.
//  - jam_peak_concurrent 3: J1 (10:00–10:30), J2 (10:20–10:35) and the open
//    J4 (10:25–12:00, `now`-capped) all overlap from 10:25 to 10:30 — the open
//    session's `now`-capped interval is what lifts the peak from 2 to 3.
//  - jam_recordings_completed 1: exactly one completed recording is updated
//    in the window (the in_progress one and the previous-day completed one
//    are not counted).
const seedJam = async (profileIds: {
  member1: string;
  member2: string;
  guest: string;
  deleted: string;
}) => {
  const pool = pgPool();
  const POST_J1 = '01970000-0000-7000-8000-0000000000a1';
  const POST_J2 = '01970000-0000-7000-8000-0000000000a2';
  const POST_J3 = '01970000-0000-7000-8000-0000000000a3';
  const POST_J4 = '01970000-0000-7000-8000-0000000000a4';
  const J_OCC = '2026-08-03T10:00:00.000Z';

  const ev = (
    id: string,
    post: string,
    type: string,
    at: string,
    extra: { profileId?: string; recurrenceId?: string } = {},
  ) =>
    // recurrence_id and body.recurrenceId are written from the same value on
    // purpose: this seed exercises the analytics SQL, not the rowToDocument
    // column-overrides-body rule (which the jam_events read path never
    // reaches here). That rule's intentional mismatch fixture lives in
    // registry.jams.test.ts; do not diverge the two values in this seed.
    pool.query(
      `INSERT INTO jam_events (id, post_id, recurrence_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [
        id,
        post,
        extra.recurrenceId ?? null,
        JSON.stringify({ type, ...extra }),
        at,
      ],
    );

  const at = (time: string) => `${DAY}T${time}`;
  const nextDay = (time: string) =>
    `${addDays(parseISO(`${DAY}T00:00:00.000Z`), 1)
      .toISOString()
      .slice(0, 10)}T${time}`;
  await ev(
    '01970000-0000-7000-8000-0000000000e1',
    POST_J1,
    'start',
    at('10:00:00.000Z'),
    { recurrenceId: J_OCC },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e2',
    POST_J2,
    'start',
    at('10:20:00.000Z'),
  );
  // J3 spans midnight: it starts at the end of DAY and closes after the day
  // boundary, so its 45 minutes must still be attributed to DAY.
  await ev(
    '01970000-0000-7000-8000-0000000000eb',
    POST_J3,
    'start',
    at('23:30:00.000Z'),
  );
  await ev(
    '01970000-0000-7000-8000-0000000000ec',
    POST_J3,
    'close',
    nextDay('00:15:00.000Z'),
  );
  // J4 never closes: its interval end is the pinned wall clock (12:00), so it
  // overlaps J1/J2 from 10:25 — the `now`-cap branch. An open session adds no
  // settled minutes, only a `now`-capped concurrency interval.
  await ev(
    '01970000-0000-7000-8000-0000000000ed',
    POST_J4,
    'start',
    at('10:25:00.000Z'),
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e3',
    POST_J1,
    'close',
    at('10:30:00.000Z'),
    { recurrenceId: J_OCC },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e4',
    POST_J2,
    'close',
    at('10:35:00.000Z'),
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e5',
    POST_J1,
    'join',
    at('10:05:00.000Z'),
    { profileId: profileIds.member1, recurrenceId: J_OCC },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e6',
    POST_J1,
    'join',
    at('10:15:00.000Z'),
    { profileId: profileIds.member1, recurrenceId: J_OCC },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e7',
    POST_J2,
    'join',
    at('10:25:00.000Z'),
    { profileId: profileIds.member2 },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e8',
    POST_J2,
    'join',
    at('10:28:00.000Z'),
    { profileId: profileIds.member1 },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000e9',
    POST_J2,
    'join',
    at('10:31:00.000Z'),
    { profileId: profileIds.guest },
  );
  await ev(
    '01970000-0000-7000-8000-0000000000ea',
    POST_J2,
    'join',
    at('10:33:00.000Z'),
    { profileId: profileIds.deleted },
  );

  const rec = (id: string, status: string, updatedAt: string) =>
    pool.query(
      `INSERT INTO jam_recordings (id, from_id, to_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        POST_J1,
        'recording',
        JSON.stringify({ status }),
        '2026-08-01T00:00:00.000Z',
        updatedAt,
      ],
    );
  await rec(
    '01970000-0000-7000-8000-0000000000f1',
    'completed',
    at('12:00:00.000Z'),
  );
  await rec(
    '01970000-0000-7000-8000-0000000000f2',
    'in_progress',
    at('12:05:00.000Z'),
  );
  await rec(
    '01970000-0000-7000-8000-0000000000f3',
    'completed',
    '2026-08-02T12:00:00.000Z',
  );
};

maybe('compileAnalyticsDay', () => {
  afterAll(async () => {
    vi.useRealTimers();
    await closePostgres();
  });
  afterEach(() => {
    vi.useRealTimers();
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

  it('fills the daily row jam columns from the jam_events seed', async () => {
    // The open session (J4) has no settled minutes, but its concurrency
    // interval is capped at the compile wall clock, so pin `Date.now` to
    // 12:00 UTC on the day under test: J4 (10:25, never closed) then overlaps
    // J1/J2 from 10:25 to 10:30, lifting the peak to 3 deterministically.
    vi.useFakeTimers('date');
    vi.setSystemTime(new Date(`${DAY}T12:00:00.000Z`));
    await empty();
    const profileIds = await seed();
    await seedJam(profileIds);
    await compileAnalyticsDay(DAY);

    const pool = pgPool();
    const totals = await pool.query(
      `SELECT jam_sessions, jam_participants, jam_unique_attendees,
              jam_minutes, jam_peak_concurrent, jam_recordings_completed
       FROM analytics_daily_totals WHERE day = $1`,
      [DAY],
    );
    expect(totals.rows).toHaveLength(1);
    const row = totals.rows[0] as Record<string, unknown>;

    // The wiring: compileAnalyticsDay → computeJamStats → the day's INSERT.
    // A broken column mapping (name typo, dropped field) would land 0 here
    // while jamMetrics.test.ts still passes, so the values are the
    // hand-computed ones from the seed, not a re-query of the same tables.
    // J3 (midnight-spanning) pins the start-day attribution; J4 (open) pins
    // the `now`-capped end branch and lifts the peak to 3.
    expect(Number(row.jam_sessions)).toBe(4);
    expect(Number(row.jam_participants)).toBe(3);
    expect(Number(row.jam_unique_attendees)).toBe(2);
    expect(Number(row.jam_minutes)).toBe(90);
    expect(Number(row.jam_peak_concurrent)).toBe(3);
    expect(Number(row.jam_recordings_completed)).toBe(1);
  });
});
