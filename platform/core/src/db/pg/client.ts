import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { logger } from '../../log';
import { schema, type Schema } from './schema';
import { runMigrations } from './migrate';

const log = logger('allpeep:pg');

export type PgDb = NodePgDatabase<Schema>;

let pool: pg.Pool | undefined;
let dbInstance: PgDb | undefined;

export const pgConnectionString = () =>
  process.env.DATABASE_URL ??
  'postgresql://openpeeps:openpeeps@localhost:5432/openpeeps';

export const pgPool = (): pg.Pool => {
  if (!pool) {
    pool = new pg.Pool({ connectionString: pgConnectionString() });
    pool.on('error', (err) => log.error(err, 'Postgres pool error'));
  }
  return pool;
};

export const pgDb = (): PgDb => {
  if (!dbInstance) {
    dbInstance = drizzle(pgPool(), { schema });
  }
  return dbInstance;
};

export const initPostgres = async (): Promise<PgDb> => {
  const client = pgPool();
  await client.query('SELECT 1');
  log.info('Postgres connection established');
  await runMigrations();
  return pgDb();
};

export const closePostgres = async () => {
  await pool?.end();
  pool = undefined;
  dbInstance = undefined;
};

/**
 * Wipe all app tables after a failed auto-migration (keeps the database).
 * Also drops the `drizzle` schema — Drizzle records applied migrations there
 * (not in `public`), so leaving it would make the next `migrate()` a no-op
 * while app tables are gone.
 */
export const wipePostgresDatabase = async () => {
  const db = pgDb();
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS public CASCADE'));
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS drizzle CASCADE'));
  await db.execute(sql.raw('CREATE SCHEMA IF NOT EXISTS public'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO CURRENT_USER'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO public'));
  log.warn('Wiped Postgres public + drizzle schemas after failed migration');
  await closePostgres();
};
