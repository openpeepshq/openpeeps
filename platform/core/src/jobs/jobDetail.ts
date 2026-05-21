import type { AdminJobDetail } from '@openpeeps/common/types';
import { Queue } from 'bullmq';
import { connection, queues } from './index';

const getOrCreateQueue = (queueName: string): Queue =>
  queues[queueName] ??
  (queues[queueName] = new Queue(queueName, { connection }));

export const getJobDetail = async (
  queueName: string,
  jobId: string,
): Promise<AdminJobDetail | null> => {
  const queue = getOrCreateQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job || job.id == null) {
    return null;
  }

  const [state, { logs, count }] = await Promise.all([
    job.getState(),
    queue.getJobLogs(jobId, 0, 500),
  ]);

  return {
    queue: queueName,
    id: String(job.id),
    name: job.name,
    state,
    failedReason: job.failedReason ?? null,
    finishedOn: job.finishedOn ?? null,
    processedOn: job.processedOn ?? null,
    timestamp: job.timestamp ?? null,
    data: job.data ?? null,
    logs,
    logCount: count,
  };
};
