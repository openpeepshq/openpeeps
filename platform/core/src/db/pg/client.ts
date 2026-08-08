import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { logger } from '../../log';
import { dbTimingEnabled, maybeLogSlowQuery } from '../../performance';
import { schema, type Schema } from './schema';
import { assertSchemaReady, runMigrations } from './migrate';

const log = logger('openpeeps:pg');

/** Shared by initPostgres + auto-migrate so DDL cannot race an import. */
export const SCHEMA_MIGRATE_LOCK = { key1: 8742301, key2: 1 } as const;

export type PgDb = NodePgDatabase<Schema>;

let pool: pg.Pool | undefined;
let dbInstance: PgDb | undefined;

export const pgConnectionString = () =>
  process.env.DATABASE_URL ??
  'postgresql://openpeeps:openpeeps@localhost:5432/openpeeps';

const instrumentPoolQuery = (target: pg.Pool) => {
  if (!dbTimingEnabled()) return;
  const originalQuery = target.query.bind(target) as (
    ...args: unknown[]
  ) => unknown;
  // Pool.query has many overloads; wrap for timing without changing call sites.
  (target as unknown as { query: (...args: unknown[]) => unknown }).query = (
    ...args: unknown[]
  ) => {
    const start = performance.now();
    const result = originalQuery(...args);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then(
        (value) => {
          maybeLogSlowQuery(args[0], performance.now() - start);
          return value;
        },
        (err: unknown) => {
          maybeLogSlowQuery(args[0], performance.now() - start);
          throw err;
        },
      );
    }
    maybeLogSlowQuery(args[0], performance.now() - start);
    return result;
  };
};

export const pgPool = (): pg.Pool => {
  if (!pool) {
    pool = new pg.Pool({ connectionString: pgConnectionString() });
    pool.on('error', (err) => log.error(err, 'Postgres pool error'));
    instrumentPoolQuery(pool);
  }
  return pool;
};

export const pgDb = (): PgDb => {
  if (!dbInstance) {
    dbInstance = drizzle(pgPool(), { schema });
  }
  return dbInstance;
};

/**
 * Hold a session-level advisory lock on a dedicated checked-out client for the
 * duration of `fn`. Other pool clients may still run queries; only another
 * lock acquisition on the same keys will block.
 */
export const withPostgresAdvisoryLock = async <T>(
  key1: number,
  key2: number,
  fn: () => Promise<T>,
): Promise<T> => {
  const client = await pgPool().connect();
  try {
    await client.query('SELECT pg_advisory_lock($1::int, $2::int)', [
      key1,
      key2,
    ]);
    await client.query('SET search_path TO public');
    try {
      return await fn();
    } finally {
      await client
        .query('SELECT pg_advisory_unlock($1::int, $2::int)', [key1, key2])
        .catch((err) => {
          log.error(err, 'Failed to release Postgres advisory lock');
        });
    }
  } finally {
    client.release();
  }
};

export const initPostgres = async (): Promise<PgDb> => {
  const client = pgPool();
  await client.query('SELECT 1');
  await client.query('SET search_path TO public');
  log.info('Postgres connection established');
  // Hosted web/worker set RUN_DB_MIGRATE_ON_BOOT=false; migrate runs as one-shot.
  if (process.env.RUN_DB_MIGRATE_ON_BOOT !== 'false') {
    await withPostgresAdvisoryLock(
      SCHEMA_MIGRATE_LOCK.key1,
      SCHEMA_MIGRATE_LOCK.key2,
      () => runMigrations(),
    );
  } else {
    await assertSchemaReady();
  }
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
 * Closes the pool by default so remigrate does not reuse connections whose
 * search_path still points at the dropped public schema OID. Pass
 * `{ closePool: false }` when a caller still holds a pooled client (e.g.
 * advisory lock).
 */
export const resetPostgresSchemas = async (
  options: { closePool?: boolean } = {},
) => {
  const closePool = options.closePool ?? true;
  const db = pgDb();
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS public CASCADE'));
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS drizzle CASCADE'));
  await db.execute(sql.raw('CREATE SCHEMA IF NOT EXISTS public'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO CURRENT_USER'));
  await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO public'));
  if (closePool) {
    await closePostgres();
  }
};

/** Wipe all app tables after a failed auto-migration (keeps the database). */
export const wipePostgresDatabase = async () => {
  await resetPostgresSchemas();
  log.warn('Wiped Postgres public + drizzle schemas after failed migration');
};
