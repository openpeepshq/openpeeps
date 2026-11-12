import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { empty } from '../db';
import { closePostgres, pgPool } from '../db/pg/client';
import { closeRedisConnections } from '../redis';
import { compileAnalyticsDay } from './compile';

// A member and a non-member both act on the same day: the rollup must count
// only the member (join to a live local profile), keeping the stored series
// consistent with the overview card.
const MEMBER_ID = '00000000-0000-0000-0000-000000000201';
const FEDERATED_ID = '00000000-0000-0000-0000-000000000202';
const DAY = '2026-08-03';
const AT = `${DAY}T12:00:00.000Z`;

const seed = async () => {
  const pool = pgPool();
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES ($1, 'rollup-member', 'local', '2026-07-20T00:00:00.000Z', '2026-07-20T00:00:00.000Z')`,
    [MEMBER_ID],
  );
  await pool.query(
    `INSERT INTO profiles (id, handle, type, created_at, updated_at)
     VALUES ($1, 'rollup-federated', 'federated', '2026-07-20T00:00:00.000Z', '2026-07-20T00:00:00.000Z')`,
    [FEDERATED_ID],
  );
  await pool.query(
    `INSERT INTO posts (id, type, visibility, creator_id, created_at, updated_at)
     VALUES (gen_random_uuid(), 'note', 'public', $1, $2, $2)`,
    [MEMBER_ID, AT],
  );
  await pool.query(
    `INSERT INTO bookmarks (id, from_id, to_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, gen_random_uuid()::text, $2, $2)`,
    [FEDERATED_ID, AT],
  );
};

const hasPostgres = await (async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
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
  beforeEach(async () => {
    await empty();
    await seed();
    await compileAnalyticsDay(DAY);
  });

  afterAll(async () => {
    await closePostgres();
    await closeRedisConnections();
  });

  it('counts only live local members as active in the daily rollup', async () => {
    const pool = pgPool();
    const res = await pool.query(
      `SELECT active_members FROM analytics_daily_totals WHERE day = $1`,
      [DAY],
    );
    expect(res.rows[0].active_members).toBe(1);
  });
});
