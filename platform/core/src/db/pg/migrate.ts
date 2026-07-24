import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { logger } from '../../log';
import { pgDb } from './client';

const log = logger('allpeep:pg:migrate');

const moduleDir = dirname(fileURLToPath(import.meta.url));

const resolveMigrationsFolder = () => {
  const besideModule = join(moduleDir, 'sql');
  if (existsSync(besideModule)) {
    return besideModule;
  }
  return join(moduleDir, '..', '..', '..', 'src', 'db', 'pg', 'sql');
};

const migrationsFolder = resolveMigrationsFolder();

/** Sentinel app table created by the initial SQL migration. */
const APP_SCHEMA_SENTINEL = 'configs';

const appSchemaExists = async (): Promise<boolean> => {
  const db = pgDb();
  const result = await db.execute<{ regclass: string | null }>(
    sql.raw(
      `SELECT to_regclass('public.${APP_SCHEMA_SENTINEL}')::text AS regclass`,
    ),
  );
  return result.rows[0]?.regclass != null;
};

const applyMigrations = async () => {
  await migrate(pgDb(), { migrationsFolder });
};

/**
 * Apply Drizzle migrations. If the journal says they are applied but app
 * tables are missing (e.g. a prior wipe only dropped `public`), reset the
 * `drizzle` schema and remigrate.
 */
export const runMigrations = async () => {
  log.info('Running Postgres migrations from %s', migrationsFolder);
  await applyMigrations();

  if (!(await appSchemaExists())) {
    log.warn(
      'Drizzle journal present but public.%s missing; resetting drizzle schema and remigrating',
      APP_SCHEMA_SENTINEL,
    );
    await pgDb().execute(sql.raw('DROP SCHEMA IF EXISTS drizzle CASCADE'));
    await applyMigrations();
    if (!(await appSchemaExists())) {
      throw new Error(
        `Postgres migrations completed but public.${APP_SCHEMA_SENTINEL} still missing`,
      );
    }
  }

  log.info('Postgres migrations complete');
};
