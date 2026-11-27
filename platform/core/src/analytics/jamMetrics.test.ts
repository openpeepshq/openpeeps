import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { empty } from '../db';
import {
  closePostgres,
  pgConnectionString,
  pgDb,
  pgPool,
} from '../db/pg/client';
import { computeJamStats } from './jamMetrics';

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

// One day window so every fixture row is unambiguously in or out of range.
const START = '2026-08-03T00:00:00.000Z';
const END = '2026-08-04T00:00:00.000Z';
const DAY = '2026-08-03T';

const POST_A = '01970000-0000-7000-8000-0000000000a1';
const POST_B = '01970000-0000-7000-8000-0000000000b1';
const OCC_A1 = '2026-08-03T10:00:00.000Z';
const OCC_A2 = '2026-08-03T11:00:00.000Z';

const LOCAL_1 = '01970000-0000-7000-8000-0000000000c1';
const LOCAL_2 = '01970000-0000-7000-8000-0000000000c2';
const GUEST_1 = '01970000-0000-7000-8000-0000000000c3';
const DELETED_1 = '01970000-0000-7000-8000-0000000000c4';

const seed = async () => {
  const pool = pgPool();

  // Two live local members, one public guest, one deleted local profile:
  // only the live locals may enter the participant/attendee counts.
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES ($1, 'local-1', 'local', $2, $2), ($3, 'local-2', 'local', $4, $4)`,
    [LOCAL_1, DAY + '00:00:00.000Z', LOCAL_2, DAY + '00:00:00.000Z'],
  );
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at, deleted_at)
     VALUES ($1, 'guest-1', 'guest', $2, $2, NULL),
            ($3, 'gone-1', 'local', $4, $4, $5)`,
    [
      GUEST_1,
      DAY + '00:00:00.000Z',
      DELETED_1,
      DAY + '00:00:00.000Z',
      DAY + '00:00:00.000Z',
    ],
  );

  const event = (
    id: string,
    post: string,
    type: string,
    at: string,
    extra: Record<string, unknown> = {},
  ) =>
    pool.query(
      `INSERT INTO jam_events (id, post_id, recurrence_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [
        id,
        post,
        extra.recurrenceId ?? null,
        JSON.stringify({ type, profileId: extra.profileId, ...extra }),
        at,
      ],
    );

  // Sessions — three (post, occurrence) pairs, not four:
  //  - POST_A runs two occurrences (OCC_A1, OCC_A2) → a recurring series is
  //    N sessions, not 1;
  //  - POST_B is one-off (recurrence_id NULL) → coalesces to '';
  //  - the 2026-08-02 start of POST_A is outside the window and must not
  //    count, and its 09:55 close has no in-window start to pair with.
  await event(
    '01970000-0000-7000-8000-0000000000e1',
    POST_A,
    'start',
    '2026-08-02T10:00:00.000Z',
    { recurrenceId: '2026-08-02T10:00:00.000Z' },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e2',
    POST_A,
    'close',
    '2026-08-03T09:55:00.000Z',
    { recurrenceId: '2026-08-02T10:00:00.000Z' },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e3',
    POST_A,
    'start',
    DAY + '10:00:00.000Z',
    { recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e4',
    POST_A,
    'start',
    DAY + '11:00:00.000Z',
    { recurrenceId: OCC_A2 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e5',
    POST_B,
    'start',
    DAY + '10:15:00.000Z',
  );

  // Closes — POST_A closes both occurrences (30 min each); POST_B never
  // closes (a start without a close counts 0 minutes but stays "open" for
  // the concurrency sweep until Date.now()).
  await event(
    '01970000-0000-7000-8000-0000000000e6',
    POST_A,
    'close',
    DAY + '10:30:00.000Z',
    { recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e7',
    POST_A,
    'close',
    DAY + '11:30:00.000Z',
    { recurrenceId: OCC_A2 },
  );

  // Attendance — three distinct (profile, jam) pairings, two distinct
  // attendees. LOCAL_1's second join of POST_A is a reconnect and must not
  // inflate either count; the guest and the deleted profile are excluded.
  await event(
    '01970000-0000-7000-8000-0000000000e8',
    POST_A,
    'join',
    DAY + '10:05:00.000Z',
    { profileId: LOCAL_1, recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000e9',
    POST_A,
    'join',
    DAY + '10:40:00.000Z',
    { profileId: LOCAL_1, recurrenceId: OCC_A1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000ea',
    POST_B,
    'join',
    DAY + '10:45:00.000Z',
    { profileId: LOCAL_2 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000eb',
    POST_B,
    'join',
    DAY + '10:50:00.000Z',
    { profileId: GUEST_1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000ec',
    POST_B,
    'join',
    DAY + '10:55:00.000Z',
    { profileId: DELETED_1 },
  );
  await event(
    '01970000-0000-7000-8000-0000000000ed',
    POST_B,
    'join',
    DAY + '10:58:00.000Z',
    { profileId: LOCAL_1 },
  );

  // Recordings — exactly one completed in the window; an in-progress one in
  // the window and a completed one from a previous day are not counted.
  const recording = (id: string, status: string, updatedAt: string) =>
    pool.query(
      `INSERT INTO jam_recordings (id, from_id, to_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        POST_A,
        'recording',
        JSON.stringify({ status }),
        '2026-08-01T00:00:00.000Z',
        updatedAt,
      ],
    );
  await recording(
    '01970000-0000-7000-8000-0000000000f1',
    'completed',
    DAY + '12:00:00.000Z',
  );
  await recording(
    '01970000-0000-7000-8000-0000000000f2',
    'in_progress',
    DAY + '12:05:00.000Z',
  );
  await recording(
    '01970000-0000-7000-8000-0000000000f3',
    'completed',
    '2026-08-02T12:00:00.000Z',
  );
};

maybe('computeJamStats', () => {
  afterAll(async () => {
    await closePostgres();
  });

  it('counts sessions per occurrence, attendance per profile, minutes and peak concurrency', async () => {
    await empty();
    await seed();

    const stats = await computeJamStats(pgDb(), START, END);

    // (post, occurrence) pairs: (A, OCC_A1), (A, OCC_A2), (B, '') — the
    // out-of-window start and its orphan close contribute nothing.
    expect(stats.jamSessions).toBe(3);
    // (profile, jam) pairings: LOCAL_1@A (reconnect collapsed), LOCAL_1@B,
    // LOCAL_2@B — guest and deleted-profile joins excluded.
    expect(stats.jamParticipants).toBe(3);
    // Distinct attendees across all jams: LOCAL_1, LOCAL_2.
    expect(stats.jamUniqueAttendees).toBe(2);
    // 30 + 30 minutes of closed sessions; POST_B's open session is 0.
    expect(stats.jamMinutes).toBe(60);
    // POST_A(OCC_A1) 10:00–10:30 overlaps POST_B (open since 10:15) for 15
    // minutes → peak 2, even though POST_B never closes.
    expect(stats.jamPeakConcurrent).toBe(2);
    expect(stats.jamRecordingsCompleted).toBe(1);
  });
});
