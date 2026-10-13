import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { forgetStreamAccess } from './streaming';
import {
  collectUnreferencedMedia,
  deleteStoredMediaNow,
  MEDIA_GC_GRACE_MS,
} from './garbageCollection';

const log = logger('app:media:gc');

const DAY_MS = 24 * 60 * 60 * 1000;

// 04:30 UTC: after stream cleanup (03:00) and clear of the 04:00 occurrence job.
export const MEDIA_GC_CRON = '30 4 * * *';
const SCHEDULER_ID = 'media-garbage-collection-daily';
const JOB_NAME = 'collect';

export interface MediaGarbageCollectionJobData {
  /** Override the unreferenced window; mostly for testing. */
  graceMs?: number;
}

const [mediaGarbageCollectionQueue, mediaGarbageCollectionWorker] =
  queueAndWorker<MediaGarbageCollectionJobData, void>(
    'media-garbage-collection',
    async (job) => {
      const graceMs = job.data?.graceMs ?? MEDIA_GC_GRACE_MS;
      log.info(
        `Running media garbage collection (graceMs=${graceMs}, ~${Math.round(
          graceMs / DAY_MS,
        )}d)`,
      );
      const result = await collectUnreferencedMedia(graceMs);
      log.info(
        `Media GC done: referenced=${result.referenced}, ` +
          `deleted=${result.deleted.length}, marked=${result.marked}, ` +
          `kept=${result.kept}, temps=${result.tempDeleted}, ` +
          `attachments=${result.attachmentsDeleted}, ` +
          `skipped=${result.skipped.length}`,
      );
      await Promise.all(
        result.deleted.map((storageId) =>
          forgetStreamAccess(storageId).catch((error: unknown) => {
            log.warn(
              `Failed to forget stream access for ${storageId}: ${
                (error as Error).message
              }`,
            );
          }),
        ),
      );
    },
    {
      defaultJobOptions: {
        removeOnComplete: { count: 10 },
        removeOnFail: { age: 86400 * 14, count: 50 },
      },
    },
  );

export const ensureMediaGarbageCollectionSchedule = async (): Promise<void> => {
  const queue = mediaGarbageCollectionQueue();
  await queue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: MEDIA_GC_CRON },
    { name: JOB_NAME },
  );
  log.info(
    `Media garbage collection schedule registered: cron="${MEDIA_GC_CRON}" ` +
      `grace=${Math.round(MEDIA_GC_GRACE_MS / DAY_MS)}d`,
  );
};

export { mediaGarbageCollectionQueue, mediaGarbageCollectionWorker };

export interface MediaDeletionJobData {
  storageId: string;
}

const [mediaDeletionQueue, mediaDeletionWorker] = queueAndWorker<
  MediaDeletionJobData,
  void
>(
  'media-deletion',
  async (job) => {
    const { storageId } = job.data;
    log.info(`Deleting media file ${storageId}`);
    const removed = await deleteStoredMediaNow(storageId);
    if (!removed) {
      log.warn(`Media file ${storageId} was not found during deletion job`);
    } else {
      log.info(`Deleted media file ${storageId}`);
    }
  },
  {
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export const enqueueMediaDeletion = async (
  storageId: string,
): Promise<void> => {
  await mediaDeletionQueue().add(
    'delete',
    { storageId },
    { jobId: `delete-${storageId}` },
  );
};

export { mediaDeletionQueue, mediaDeletionWorker };
