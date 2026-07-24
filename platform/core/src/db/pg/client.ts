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
    // After DROP/CREATE public, old connections keep a stale search_path OID.
    pool.on('connect', (client) => {
      client.query('SET search_path TO public').catch((err) => {
        log.error(err, 'Failed to set Postgres search_path on connect');
      });
    });
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
 * Drop and recreate app schemas. Drizzle stores its migration journal in
 * `drizzle` (not `public`); both must be cleared or the next migrate() is a
 * no-op / conflicts with leftover types.
 *
 * Closes the pool so remigrate does not reuse connections whose search_path
 * still points at the dropped public schema OID.
 */
export const resetPostgresSchemas = async () => {
  const db = pgDb();
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS public CASCADE'));
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS drizzle CASCADE'));
  await db.execute(sql.raw('CREATE SCHEMA IF NOT EXISTS public'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO CURRENT_USER'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO public'));
  await closePostgres();
};

/** Wipe all app tables after a failed auto-migration (keeps the database). */
export const wipePostgresDatabase = async () => {
  await resetPostgresSchemas();
  log.warn('Wiped Postgres public + drizzle schemas after failed migration');
};
