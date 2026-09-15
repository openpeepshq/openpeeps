import { logger } from '../log';
import { initPostgres } from './pg/client';
import { OpenpeepsDatabase } from './types';
import { backfillLocalFederationIdentities } from '../federation/identity';

const log = logger('openpeeps:db');

export const initDb = async (): Promise<OpenpeepsDatabase> => {
  log.info('Initializing Postgres');
  const db = await initPostgres();
  await backfillLocalFederationIdentities();
  return { db };
};
