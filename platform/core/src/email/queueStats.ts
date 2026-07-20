import type { AdminEmailQueueStats } from '@openpeeps/common/types';
import { SEND_EMAIL_QUEUE_NAME, sendEmailQueue } from './jobs';

const n = (record: Record<string, number>, key: string) => record[key] ?? 0;

export const getSendEmailQueueStats =
  async (): Promise<AdminEmailQueueStats> => {
    const queue = sendEmailQueue();
    const raw = await queue.getJobCounts();
    const failedJobs = await queue.getFailed(0, 9);

    return {
      counts: {
        waiting: n(raw, 'waiting') + n(raw, 'paused'),
        active: n(raw, 'active'),
        completed: n(raw, 'completed'),
        failed: n(raw, 'failed'),
        delayed: n(raw, 'delayed'),
        prioritized: n(raw, 'prioritized'),
      },
      recentFailures: failedJobs.map((j) => ({
        queue: SEND_EMAIL_QUEUE_NAME,
        id: j.id ?? null,
        name: j.name,
        failedReason: j.failedReason ?? '',
        finishedOn: j.finishedOn ?? null,
      })),
    };
  };
