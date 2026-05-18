import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { cleanupStaleStreams } from './streaming';

const log = logger('app:media:streamingCleanupJobs');

const DAY_MS = 24 * 60 * 60 * 1000;

export const STREAM_INACTIVITY_TTL_MS = 7 * DAY_MS;
// Cron pattern (UTC): every day at 03:00. Off-peak for most regions and
// staggered away from other daily housekeeping the platform may run.
export const STREAM_CLEANUP_CRON = '0 3 * * *';
const SCHEDULER_ID = 'streaming-cleanup-daily';
const JOB_NAME = 'cleanup';

export interface MediaStreamingCleanupJobData {
  /** Override the inactivity threshold; mostly for testing. */
  maxAgeMs?: number;
}

const [mediaStreamingCleanupQueue, mediaStreamingCleanupWorker] =
  queueAndWorker<MediaStreamingCleanupJobData, void>(
    'media-streaming-cleanup',
    async (job) => {
      const maxAgeMs = job.data.maxAgeMs ?? STREAM_INACTIVITY_TTL_MS;
      log.info(
        `Running stream cleanup (maxAgeMs=${maxAgeMs}, ~${Math.round(
          maxAgeMs / DAY_MS,
        )}d)`,
      );
      const result = await cleanupStaleStreams(maxAgeMs);
      log.info(
        `Stream cleanup done: deleted=${result.deleted.length}, ` +
          `kept=${result.kept}, skipped=${result.skipped.length}`,
      );
      if (result.deleted.length > 0) {
        log.info(`Deleted streams: ${result.deleted.join(', ')}`);
      }
      if (result.skipped.length > 0) {
        // These are entries in the hls root that don't match the storage-id
        // shape (e.g. an operator-placed file). Surface them so they can be
        // cleaned up by hand instead of silently lingering forever.
        log.warn(
          `Skipped non-storage-id entries in hls root: ${result.skipped.join(', ')}`,
        );
      }
    },
    {
      defaultJobOptions: {
        // We never need more than the most recent run; keep a small history
        // for debugging and let BullMQ trim the rest.
        removeOnComplete: { count: 10 },
        removeOnFail: { age: 86400 * 14, count: 50 },
      },
    },
  );

/**
 * Registers (or refreshes) the daily cleanup schedule with BullMQ. Safe to
 * call repeatedly — `upsertJobScheduler` is idempotent and overwrites the
 * existing schedule entry under the same id.
 */
export const ensureStreamingCleanupSchedule = async (): Promise<void> => {
  const queue = mediaStreamingCleanupQueue();
  await queue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: STREAM_CLEANUP_CRON },
    { name: JOB_NAME },
  );
  log.info(
    `Streaming cleanup schedule registered: cron="${STREAM_CLEANUP_CRON}" ` +
      `ttl=${Math.round(STREAM_INACTIVITY_TTL_MS / DAY_MS)}d`,
  );
};

export { mediaStreamingCleanupQueue, mediaStreamingCleanupWorker };
