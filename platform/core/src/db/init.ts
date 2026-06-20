import { logger } from '../log';
import { initPostgres } from './pg/client';
import { OpenpeepsDatabase } from './types';

const log = logger('allpeep:db');

export const initDb = async (): Promise<OpenpeepsDatabase> => {
  log.info('Initializing Postgres');
  const db = await initPostgres();
  return { db };
};
