import { logger } from '../log';
import { initDb } from './init';
import { closePostgres } from './pg/client';

const log = logger('allpeep:db:boot-migrate');

// One-shot deploy migrate (`start.sh migrate` / apatmigrate).
initDb()
  .then(() => closePostgres())
  .then(() => {
    log.info('Migrate job finished');
    process.exit(0);
  })
  .catch((err: unknown) => {
    log.error('Migrate job failed', err);
    void closePostgres().finally(() => process.exit(1));
  });
