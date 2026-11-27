import { sql, type SQL } from 'drizzle-orm';
import type { PgDb } from '../db';

/**
 * Aggregate jam activity over a range of `analytics_daily_totals`-style
 * bounds. `jamSessions` counts distinct (post, occurrence) starts in the range:
 * a recurring series that met N times is N sessions (not 1), while a one-off
 * event is a single session — the occurrence collapses to `''` for one-offs, so
 * repeat starts of the same one-off coalesce. `jamParticipants` counts distinct
 * (profile, jam) pairs — a person in 3 jams is 3 here; `jamUniqueAttendees`
 * counts distinct profiles across the whole range — the same person in 3 jams
 * is 1. Both are scoped to live local profiles (guests are public profiles and
 * excluded, matching the rest of the analytics scope). `jamMinutes` and
 * `jamPeakConcurrent` are derived from start…close session intervals; an open
 * session (no close yet) contributes no minutes but does count toward
 * concurrency until it closes. `jamRecordingsCompleted` counts recordings whose
 * status transitioned to completed inside the range.
 *
 * `jamSessions`/`jamParticipants`/`jamUniqueAttendees` are live distinct
 * counts over the raw `jam_events` rows, while the admin chart and CSV
 * re-bucket the pre-aggregated `analytics_daily_totals`. The two are different
 * aggregations, not two readings of one number, so they can legitimately
 * disagree on the edges: the rollup attributes minutes and concurrency to the
 * session's *start* day, a close that lands in a different day (or arrives after
 * the start's day compiled) only lands on the start day when that day is
 * recompiled, and a distinct count over a bucket can differ from summing the
 * per-day distinct values.
 *
 * Session minutes are attributed to the session's *start* day. A close that
 * lands in a different day than its start, or that arrives after the start's
 * day has already been compiled, is only picked up when that day is recompiled
 * (`compileAnalyticsDay` re-runs for a day on backfill), so same-day closes can
 * briefly lag and midnight-spanning sessions always land on the start day.
 *
 * `now` (epoch ms, defaults to the current time) is the cap used for the
 * open-session end of the concurrency sweep. Callers that compute a batch of
 * results and cache them under a stable key should pass the same value they
 * captured once at entry so a single pass is internally consistent and a
 * rebuilt cache entry does not shift as real time elapses mid-pass.
 */
export type JamStats = {
  jamSessions: number;
  jamParticipants: number;
  jamUniqueAttendees: number;
  jamMinutes: number;
  jamPeakConcurrent: number;
  jamRecordingsCompleted: number;
};

const countScalar = async (db: PgDb, query: SQL) => {
  const result = await db.execute(query);
  const rows = result.rows as Array<Record<string, unknown>>;
  return Number(rows[0]?.c ?? 0);
};

export const computeJamStats = async (
  db: PgDb,
  start: string,
  end: string,
  now: number = Date.now(),
): Promise<JamStats> => {
  const [
    jamSessions,
    jamParticipants,
    jamUniqueAttendees,
    jamRecordingsCompleted,
    startsRes,
    closesRes,
  ] = await Promise.all([
    // Distinct (jam, occurrence) — a recurring series is N sessions, not 1.
    countScalar(
      db,
      sql`select count(distinct (post_id, coalesce(recurrence_id, '')))::int as c
            from jam_events
            where deleted_at is null and body->>'type' = 'start'
              and created_at >= ${start} and created_at < ${end}`,
    ),
    countScalar(
      db,
      sql`select count(distinct (je.body->>'profileId', je.post_id))::int as c
            from jam_events je
            join profiles p on p.id::text = je.body->>'profileId'
            where je.deleted_at is null and je.body->>'type' = 'join'
              and je.created_at >= ${start} and je.created_at < ${end}
              and p.type = 'local' and p.deleted_at is null`,
    ),
    countScalar(
      db,
      sql`select count(distinct je.body->>'profileId')::int as c
            from jam_events je
            join profiles p on p.id::text = je.body->>'profileId'
            where je.deleted_at is null and je.body->>'type' = 'join'
              and je.created_at >= ${start} and je.created_at < ${end}
              and p.type = 'local' and p.deleted_at is null`,
    ),
    countScalar(
      db,
      sql`select count(*)::int as c from jam_recordings
            where body->>'status' = 'completed'
              and updated_at >= ${start} and updated_at < ${end}`,
    ),
    db.execute(
      sql`select post_id, coalesce(recurrence_id, '') as rid, created_at
          from jam_events
          where deleted_at is null and body->>'type' = 'start'
            and created_at >= ${start} and created_at < ${end}
          order by created_at`,
    ),
    // No upper bound: a close after the window still settles the minutes of a
    // session that started inside it.
    db.execute(
      sql`select post_id, coalesce(recurrence_id, '') as rid, created_at
          from jam_events
          where deleted_at is null and body->>'type' = 'close'
            and created_at >= ${start}
          order by created_at`,
    ),
  ]);

  const starts = (
    startsRes.rows as Array<{
      post_id: string;
      rid: string;
      created_at: string;
    }>
  ).map((r) => ({
    key: `${r.post_id}|${r.rid}`,
    start: new Date(r.created_at).getTime(),
  }));

  const closeTimes = new Map<string, number[]>();
  for (const r of closesRes.rows as Array<{
    post_id: string;
    rid: string;
    created_at: string;
  }>) {
    const key = `${r.post_id}|${r.rid}`;
    const t = new Date(r.created_at).getTime();
    const arr = closeTimes.get(key) ?? [];
    arr.push(t);
    closeTimes.set(key, arr);
  }

  let jamMinutes = 0;
  const intervals: Array<{ s: number; e: number }> = [];
  for (const s of starts) {
    const closes = closeTimes.get(s.key);
    const close = closes?.find((c) => c >= s.start);
    if (close !== undefined) {
      const mins = Math.max(0, Math.round((close - s.start) / 60_000));
      jamMinutes += mins;
      intervals.push({ s: s.start, e: close });
    } else {
      // Still in progress — no duration yet, but it overlaps other sessions.
      // Capped at the caller-supplied `now` so a single pass is consistent.
      intervals.push({ s: s.start, e: now });
    }
  }

  let jamPeakConcurrent = 0;
  if (intervals.length > 0) {
    const points: Array<{ t: number; d: number }> = [];
    for (const iv of intervals) {
      points.push({ t: iv.s, d: 1 });
      points.push({ t: iv.e, d: -1 });
    }
    points.sort((a, b) => a.t - b.t || a.d - b.d);
    let cur = 0;
    for (const p of points) {
      cur += p.d;
      if (cur > jamPeakConcurrent) jamPeakConcurrent = cur;
    }
  }

  return {
    jamSessions,
    jamParticipants,
    jamUniqueAttendees,
    jamMinutes,
    jamPeakConcurrent,
    jamRecordingsCompleted,
  };
};
