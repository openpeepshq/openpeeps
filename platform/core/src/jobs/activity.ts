import type { Queue } from 'bullmq';
import type { JobsActivityStats } from '@openpeepshq/common/types';
import { logger } from '../log';
import { getOrCreateQueue } from './index';

const log = logger('core:jobs:activity');

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTES_24H = 24 * 60;
const COMPLETED_PAGE = 100;
const EMAIL_QUEUE = 'send-email';

/** Queue names created by `queueAndWorker` across core packages. */
export const QUEUE_NAMES = [
  EMAIL_QUEUE,
  'once',
  'process-notification',
  'media-processing',
  'media-streaming',
  'media-streaming-cleanup',
  'jam-recording-stop',
  'analytics-compile',
  'event-occurrences',
] as const;

export const sumMetricPoints = (data: Array<number | string>): number =>
  data.reduce<number>((sum, point) => sum + Number(point), 0);

export const countJobsFinishedSince = (
  jobs: Array<{ finishedOn?: number | null }>,
  since: number,
): number => jobs.filter((job) => (job.finishedOn ?? 0) >= since).length;

const completedFromMetrics = async (queue: Queue): Promise<number> => {
  const metrics = await queue.getMetrics('completed', 0, MINUTES_24H - 1);
  return sumMetricPoints(metrics.data);
};

const completedFromRetainedJobs = async (
  queue: Queue,
  since: number,
): Promise<number> => {
  let counted = 0;
  let start = 0;
  for (;;) {
    const jobs = await queue.getCompleted(start, start + COMPLETED_PAGE - 1);
    if (jobs.length === 0) break;
    counted += countJobsFinishedSince(jobs, since);
    const oldest = jobs[jobs.length - 1];
    if ((oldest.finishedOn ?? 0) < since) break;
    if (jobs.length < COMPLETED_PAGE) break;
    start += COMPLETED_PAGE;
  }
  return counted;
};

export const completedLast24h = async (
  queue: Queue,
  since = Date.now() - DAY_MS,
): Promise<number> => {
  const [fromMetrics, fromJobs] = await Promise.all([
    completedFromMetrics(queue).catch(() => 0),
    completedFromRetainedJobs(queue, since).catch(() => 0),
  ]);
  return Math.max(fromMetrics, fromJobs);
};

export const jobActivityLast24h = async (): Promise<JobsActivityStats> => {
  try {
    const since = Date.now() - DAY_MS;
    const counts = await Promise.all(
      QUEUE_NAMES.map(async (name) => ({
        name,
        completed: await completedLast24h(getOrCreateQueue(name), since),
      })),
    );
    return {
      completedLast24h: counts.reduce((sum, row) => sum + row.completed, 0),
      emailsSentLast24h:
        counts.find((row) => row.name === EMAIL_QUEUE)?.completed ?? 0,
    };
  } catch (error) {
    log.error('Failed to read BullMQ activity for last 24h', error);
    return { completedLast24h: 0, emailsSentLast24h: 0 };
  }
};
