import { queueAndWorker } from '../jobs';
import { cleanOldLogs } from './retention';

// Cron pattern (UTC): every day at 02:00. Off-peak for most regions and
// staggered away from the other daily housekeeping (streaming cleanup 03:00,
// analytics retention 03:30, event occurrences 04:00).
export const LOG_RETENTION_CRON = '0 2 * * *';
const SCHEDULER_ID = 'log-retention-daily';
const JOB_NAME = 'clean';

export interface LogRetentionJobData {
  /** Override the zip threshold; mostly for testing. */
  zipAfterDays?: number;
  /** Override the delete threshold; mostly for testing. */
  deleteAfterDays?: number;
  /** Override the log directory; mostly for testing. */
  dir?: string;
}

const [logRetentionQueue, logRetentionWorker] = queueAndWorker<
  LogRetentionJobData,
  void
>(
  'log-retention',
  async (job) => {
    // Dynamic imports: the log barrel is among the first modules loaded,
    // and ../config -> ../events -> this barrel, so a static edge would
    // create a load-time import cycle.
    const { logger } = await import('./index');
    const { config } = await import('../config');
    const log = logger('app:log:retention');
    const coreConfig = await config();
    const zipAfterDays =
      job.data.zipAfterDays ?? coreConfig.logs.retention.zipAfterDays;
    const deleteAfterDays =
      job.data.deleteAfterDays ?? coreConfig.logs.retention.deleteAfterDays;
    const dir = job.data.dir ?? coreConfig.logs.local.path;
    log.info(
      `Running log retention (zipAfterDays=${zipAfterDays}, ` +
        `deleteAfterDays=${deleteAfterDays})`,
    );
    const result = await cleanOldLogs(dir, zipAfterDays, deleteAfterDays);
    log.info(
      `Log retention done: zipped=${result.zipped.length}, ` +
        `deleted=${result.deleted.length}, untouched=${result.untouched}`,
    );
    if (result.zipped.length > 0) {
      log.info(`Zipped logs: ${result.zipped.join(', ')}`);
    }
    if (result.deleted.length > 0) {
      log.info(`Deleted logs: ${result.deleted.join(', ')}`);
    }
  },
  {
    defaultJobOptions: {
      // We never need more than the most recent runs; keep a small history
      // for debugging and let BullMQ trim the rest.
      removeOnComplete: { count: 10 },
      removeOnFail: { age: 86400 * 14, count: 50 },
    },
  },
);

/**
 * Registers (or refreshes) the daily schedule with BullMQ. Safe to call
 * repeatedly — `upsertJobScheduler` is idempotent and overwrites the existing
 * schedule entry under the same id.
 */
export const ensureLogRetentionSchedule = async (): Promise<void> => {
  const queue = logRetentionQueue();
  await queue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: LOG_RETENTION_CRON },
    { name: JOB_NAME },
  );
  const { logger } = await import('./index');
  logger('app:log:retention').info(
    `Log retention schedule registered: cron="${LOG_RETENTION_CRON}"`,
  );
};

export { logRetentionQueue, logRetentionWorker };
