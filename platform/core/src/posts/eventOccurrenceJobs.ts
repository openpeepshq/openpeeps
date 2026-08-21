import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { rebuildRecurringEventOccurrences } from './eventOccurrences';

const log = logger('app:posts:eventOccurrences');

const QUEUE_NAME = 'event-occurrences';
const SCHEDULER_ID = 'event-occurrences-daily';
const JOB_NAME = 'rebuild-recurring';
export const EVENT_OCCURRENCE_CRON = '0 4 * * *';

const [eventOccurrenceQueue, eventOccurrenceWorker] = queueAndWorker<
  { type: 'rebuild' },
  void
>(
  QUEUE_NAME,
  async () => {
    const rebuilt = await rebuildRecurringEventOccurrences();
    log.info(`Rebuilt occurrence index for ${rebuilt} recurring events`);
  },
  {
    defaultJobOptions: {
      removeOnComplete: { count: 10 },
      removeOnFail: { age: 86400 * 14, count: 50 },
    },
  },
);

export const ensureEventOccurrenceSchedule = async (): Promise<void> => {
  const queue = eventOccurrenceQueue();
  await queue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: EVENT_OCCURRENCE_CRON },
    { name: JOB_NAME, data: { type: 'rebuild' } },
  );
  log.info(
    `Event occurrence schedule registered: cron="${EVENT_OCCURRENCE_CRON}"`,
  );
};

export { eventOccurrenceQueue, eventOccurrenceWorker };
