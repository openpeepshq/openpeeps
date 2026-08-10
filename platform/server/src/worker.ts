/// <reference types="vite/client" />
import './loadServerEnv';
import { logger } from '@openpeepshq/core/log';
import { start } from '@openpeepshq/worker';

import { registerDefaultEmailTemplates } from './emails';

const log = logger('worker');

const main = async () => {
  // The BullMQ `send-email` worker calls `@openpeepshq/core/email` render
  // directly (no more HTTP round-trip to the API server), so this process
  // must populate the in-memory template registry before
  // `@openpeepshq/worker`'s `start()` opens the queue and starts pulling jobs.
  registerDefaultEmailTemplates();
  log.info('Email templates registered.');

  await start();
};

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection in worker:', reason);
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception in worker:', err);
});

main().catch((err) => {
  log.error('Failed to start worker', err);
  setTimeout(() => process.exit(1), 1000);
});
