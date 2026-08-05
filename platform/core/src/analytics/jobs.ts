import { formatISO, startOfDay, subDays } from 'date-fns';
import { sql } from 'drizzle-orm';
import { database } from '../db';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import {
  backfillAnalytics,
  compileRecentAnalytics,
  compileRetentionCohorts,
} from './compile';
import { sendMonthlyAnalyticsReport } from './report';

const log = logger('app:analytics:jobs');

export type AnalyticsJobData =
  | { type: 'compile-day' }
  | { type: 'compile-retention' }
  | { type: 'monthly-report' }
  | { type: 'backfill'; from: string; to: string };

export type AnalyticsBackfillEnqueueResult = {
  jobId: string | undefined;
  from: string;
  to: string;
};

const ANALYTICS_QUEUE = 'analytics-compile';
const COMPILE_CRON = '0 * * * *';
const RETENTION_CRON = '30 3 * * *';
const MONTHLY_REPORT_CRON = '0 8 1 * *';
const INITIAL_BACKFILL_JOB_ID = 'analytics-initial-backfill';

const defaultBackfillRange = (): { from: string; to: string } => {
  const to = formatISO(startOfDay(new Date()), { representation: 'date' });
  const from = formatISO(startOfDay(subDays(new Date(), 365)), {
    representation: 'date',
  });
  return { from, to };
};

const [analyticsCompileQueue, analyticsCompileWorker] = queueAndWorker<
  AnalyticsJobData,
  unknown
>(
  ANALYTICS_QUEUE,
  async (job) => {
    const data = job.data;
    switch (data.type) {
      case 'compile-day':
        await compileRecentAnalytics();
        return { ok: true };
      case 'compile-retention':
        await compileRetentionCohorts();
        return { ok: true };
      case 'monthly-report':
        return sendMonthlyAnalyticsReport();
      case 'backfill': {
        const count = await backfillAnalytics(data.from, data.to);
        return { days: count };
      }
      default:
        log.warn(`Unknown analytics job: ${JSON.stringify(data)}`);
        return { ok: false };
    }
  },
  {
    defaultJobOptions: {
      removeOnComplete: { count: 20 },
      removeOnFail: { age: 86400 * 14, count: 50 },
    },
  },
);

const maybeEnqueueInitialBackfill = async (): Promise<void> => {
  const db = await database();
  const result = await db.execute(
    sql`select exists(select 1 from analytics_daily_totals limit 1) as has_rows`,
  );
  const rows = result.rows as Array<{ has_rows?: boolean }>;
  if (rows[0]?.has_rows) return;

  const queue = analyticsCompileQueue();
  const existing = await queue.getJob(INITIAL_BACKFILL_JOB_ID);
  if (existing) {
    const state = await existing.getState();
    if (state !== 'failed') return;
    await existing.remove();
  }

  const { from, to } = defaultBackfillRange();
  await queue.add(
    'backfill',
    { type: 'backfill', from, to },
    { jobId: INITIAL_BACKFILL_JOB_ID },
  );
  log.info(`Enqueued initial analytics backfill ${from}..${to}`);
};

export const ensureAnalyticsSchedules = async (): Promise<void> => {
  const queue = analyticsCompileQueue();
  await queue.upsertJobScheduler(
    'analytics-compile-hourly',
    { pattern: COMPILE_CRON },
    { name: 'compile-day', data: { type: 'compile-day' } },
  );
  await queue.upsertJobScheduler(
    'analytics-retention-daily',
    { pattern: RETENTION_CRON },
    { name: 'compile-retention', data: { type: 'compile-retention' } },
  );
  await queue.upsertJobScheduler(
    'analytics-monthly-report',
    { pattern: MONTHLY_REPORT_CRON },
    { name: 'monthly-report', data: { type: 'monthly-report' } },
  );
  await maybeEnqueueInitialBackfill();
  log.info(
    `Analytics schedules registered: compile="${COMPILE_CRON}", retention="${RETENTION_CRON}", monthly="${MONTHLY_REPORT_CRON}"`,
  );
};

export const enqueueAnalyticsBackfill = async (
  from?: string,
  to?: string,
): Promise<AnalyticsBackfillEnqueueResult> => {
  const defaults = defaultBackfillRange();
  const start = from ?? defaults.from;
  const end = to ?? defaults.to;
  const job = await analyticsCompileQueue().add('backfill', {
    type: 'backfill',
    from: start,
    to: end,
  });
  return { jobId: job.id, from: start, to: end };
};

export { analyticsCompileQueue, analyticsCompileWorker };
