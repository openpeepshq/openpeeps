import { logger } from '../log';
import { initPostgres } from './pg/client';
import { OpenpeepsDatabase } from './types';

const log = logger('openpeeps:db');

export const initDb = async (): Promise<OpenpeepsDatabase> => {
  log.info('Initializing Postgres');
  if (process.env.AUTO_MIGRATE_FROM_ARANGO === 'true') {
    log.warn(
      'AUTO_MIGRATE_FROM_ARANGO is ignored at runtime. Use @openpeepshq/arango-migrate (archive/arango-migrate) for Arango cutover.',
    );
  }
  const db = await initPostgres();
  return { db };
};
