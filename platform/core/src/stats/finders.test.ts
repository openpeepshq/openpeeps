import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { empty } from '../db';
import { closePostgres, pgConnectionString, pgPool } from '../db/pg/client';
import { jamParticipantsStats, jamSessionsStats } from './finders';

// Integration tests require a real PostgreSQL instance. The CI `test-unit`
// job provides postgres + a DATABASE_URL (.forgejo/workflows/build.yaml); the
// graceful skip covers local runs without a database.
const hasPostgres = await (async () => {
  const client = new pg.Client({ connectionString: pgConnectionString() });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end();
  }
})();

const maybe = hasPostgres ? describe : describe.skip;

const POST_A = '01970000-0000-7000-8000-0000000000a1';
const POST_B = '01970000-0000-7000-8000-0000000000b1';
const POST_C = '01970000-0000-7000-8000-0000000000b2';
const OCC_A1 = '2026-11-27T00:00:00.000Z';
const LOCAL_1 = '01970000-0000-7000-8000-0000000000c1';
const LOCAL_2 = '01970000-0000-7000-8000-0000000000c2';
const GUEST_1 = '01970000-0000-7000-8000-0000000000c3';
const DELETED_1 = '01970000-0000-7000-8000-0000000000c4';

// The compileStats windows are relative to `new Date()`, so the wall clock is
// pinned: "now" is 2026-11-27T12:00Z, making the last-day period
// 2026-11-26T12:00 → 2026-11-27T12:00Z. Every in-window fixture sits in the
// current day/week/month/quarter/year periods (all created 2026-11-27T00:00Z,
// which is within the last 12 months for every period the schema reports),
// and the out-of-period fixture sits in the previous day.
const NOW = '2026-11-27T12:00:00.000Z';
const IN_WINDOW = '2026-11-27T00:00:00.000Z';
const PREV_DAY = '2026-11-26T06:00:00.000Z';

const seed = async () => {
  const pool = pgPool();

  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES ($1, 'local-1', 'local', $2, $2), ($3, 'local-2', 'local', $4, $4)`,
    [LOCAL_1, IN_WINDOW, LOCAL_2, IN_WINDOW],
  );
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at, deleted_at)
     VALUES ($1, 'guest-1', 'guest', $2, $2, NULL),
            ($3, 'gone-1', 'local', $4, $4, $5)`,
    [GUEST_1, IN_WINDOW, DELETED_1, IN_WINDOW, IN_WINDOW],
  );

  const event = (
    id: string,
    post: string,
    type: string,
    at: string,
    extra: Record<string, unknown> = {},
    deleted = false,
  ) =>
    pool.query(
      `INSERT INTO jam_events (id, post_id, recurrence_id, body, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $5, $6)`,
      [
        id,
        post,
        extra.recurrenceId ?? null,
        JSON.stringify({ type, profileId: extra.profileId, ...extra }),
        at,
        deleted ? IN_WINDOW : null,
      ],
    );

  // Sessions — two (post, occurrence) pairs: (A, OCC_A1) and (B, null). The
  // deleted start is excluded; the previous-day start is out of the current
  // day period (but still counted by `all` and every other period).
  await event(
    '01970000-0000-7000-8000-0000000000e1',
    POST_A,
    'start',
    IN_WINDOW,
    { recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e2',
    POST_B,
    'start',
    IN_WINDOW,
  );
  await event(
    '01970000-0000-7000-8000-0000000000e3',
    POST_A,
    'start',
    IN_WINDOW,
    { recurrenceId: OCC_A1 },
    true,
  );
  await event(
    '01970000-0000-7000-8000-0000000000e4',
    POST_C,
    'start',
    PREV_DAY,
  );

  // Attendance — (profile, jam) pairings: LOCAL_1@A (current day), LOCAL_2@B
  // (current day), and LOCAL_1@C (previous day, cross-day attendee: one
  // distinct profile across the full range, but counted in each day period).
  // LOCAL_1's reconnect of the same jam must not add a pairing; the guest and
  // deleted-profile joins are excluded (profiles join, local + not deleted).
  await event(
    '01970000-0000-7000-8000-0000000000f1',
    POST_A,
    'join',
    IN_WINDOW,
    { profileId: LOCAL_1, recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000f2',
    POST_A,
    'join',
    IN_WINDOW,
    { profileId: LOCAL_1, recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000f3',
    POST_B,
    'join',
    IN_WINDOW,
    { profileId: LOCAL_2 },
  );
  // Cross-day: LOCAL_1 joins a second jam on the previous day. The distinct
  // profile count must stay 1 across days (`all`) while each day period
  // counts its own joins — per-day sums would over-count this attendee.
  await event(
    '01970000-0000-7000-8000-0000000000f6',
    POST_C,
    'join',
    PREV_DAY,
    { profileId: LOCAL_1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000f4',
    POST_B,
    'join',
    IN_WINDOW,
    { profileId: GUEST_1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000f5',
    POST_B,
    'join',
    IN_WINDOW,
    { profileId: DELETED_1 },
  );
};

maybe('jam stats (sessions and participants)', () => {
  afterAll(async () => {
    vi.useRealTimers();
    await closePostgres();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('jamSessionsStats counts (post, occurrence) starts, skipping deleted rows', async () => {
    vi.useFakeTimers('date');
    vi.setSystemTime(new Date(NOW));
    await empty();
    await seed();

    const stats = await jamSessionsStats();
    // (A, OCC_A1) + (B, '') + (C, '') — the deleted (A, OCC_A1) is skipped.
    expect(stats.all).toBe(3);
    expect(stats.day.currentPeriod).toBe(2);
    expect(stats.day.lastPeriod).toBe(1);
    expect(stats.week.currentPeriod).toBe(3);
  });

  it('jamParticipantsStats counts live local profiles who joined (guests/deleted excluded)', async () => {
    vi.useFakeTimers('date');
    vi.setSystemTime(new Date(NOW));
    await empty();
    await seed();

    const stats = await jamParticipantsStats();
    // LOCAL_1 (reconnect collapsed) + LOCAL_2; guest/deleted profiles
    // excluded by the profiles join (local + not deleted). The cross-day
    // attendee (LOCAL_1 on both days) is one distinct profile overall but
    // appears in each day period — summing the per-day values (3) would
    // over-count it, so the rollup column and the live card can differ.
    expect(stats.all).toBe(2);
    expect(stats.day.currentPeriod).toBe(2);
    expect(stats.day.lastPeriod).toBe(1);
  });
});
