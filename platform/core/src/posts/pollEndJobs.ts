import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { hub } from '../events';
import { findPost } from './finders';
import { pollEndDelayMs, shouldEmitPollEnded } from './pollEnd';

const log = logger('app:posts:pollEnd');

export interface PollEndJobData {
  postId: string;
  expiresAt: string;
}

const pollEndJobId = (postId: string) => `poll-end:${postId}`;

const [pollEndQueue, pollEndWorker] = queueAndWorker<PollEndJobData, void>(
  'poll-end',
  async (job) => {
    const post = await findPost(job.data.postId);
    if (!shouldEmitPollEnded(post, job.data.expiresAt)) {
      log.info(`Skipping poll-end for ${job.data.postId}`);
      return;
    }
    log.info(`Poll ended ${job.data.postId}`);
    await hub.emit('pollEnded', post);
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export const schedulePollEnd = async (postId: string, expiresAt?: string) => {
  try {
    const queue = pollEndQueue();
    const jobId = pollEndJobId(postId);
    await queue.remove(jobId).catch(() => undefined);
    if (!expiresAt) {
      return;
    }
    const delay = pollEndDelayMs(expiresAt);
    if (delay <= 0) {
      return;
    }
    await queue.add('end', { postId, expiresAt }, { jobId, delay });
  } catch (err) {
    log.error({ err, postId }, 'Failed to schedule poll-end job');
  }
};

export const cancelPollEnd = async (postId: string) => {
  try {
    const queue = pollEndQueue();
    await queue.remove(pollEndJobId(postId));
  } catch (err) {
    log.error({ err, postId }, 'Failed to cancel poll-end job');
  }
};

export { pollEndQueue, pollEndWorker };
