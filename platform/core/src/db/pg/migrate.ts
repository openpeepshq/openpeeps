import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

export const runMigrations = async () => {
  log.info('Running Postgres migrations from %s', migrationsFolder);
  await migrate(pgDb(), { migrationsFolder });
  log.info('Postgres migrations complete');
};
