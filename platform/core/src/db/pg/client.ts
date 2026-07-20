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
