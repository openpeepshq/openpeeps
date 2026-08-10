import type { PostWithMeta } from '@openpeepshq/common/types';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { findPost } from '../posts';
import { findActiveRecording } from './finders';

const log = logger('app:jams:jobs');

export const JAM_RECORDING_MAX_DURATION_MS = 60 * 60 * 1000;

export interface JamRecordingStopJobData {
  jamPostId: string;
  recordingId: string;
}

const recordingStopJobId = (recordingId: string) =>
  `jam-recording-stop:${recordingId}`;

const [jamRecordingStopQueue, jamRecordingStopWorker] = queueAndWorker<
  JamRecordingStopJobData,
  void
>(
  'jam-recording-stop',
  async (job) => {
    // Dynamic import avoids a load-time cycle with livekit.ts (which schedules
    // this job when a recording starts).
    const { stopRecording } = await import('./livekit');
    const jamPost = await findPost(job.data.jamPostId);
    if (!jamPost || jamPost.data?.type !== 'event' || !jamPost.data.jam) {
      log.info(`Skipping auto-stop for missing jam ${job.data.jamPostId}`);
      return;
    }
    const jamEvent = jamPost as PostWithMeta;
    const active = await findActiveRecording(jamEvent);
    if (!active || active.id !== job.data.recordingId) {
      log.info(
        `Skipping auto-stop for jam ${job.data.jamPostId}: recording already stopped or replaced`,
      );
      return;
    }
    log.info(
      `Auto-stopping recording ${job.data.recordingId} for jam ${job.data.jamPostId}`,
    );
    await stopRecording(jamEvent);
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export const scheduleRecordingAutoStop = async (
  jamPostId: string,
  recordingId: string,
  delayMs: number = JAM_RECORDING_MAX_DURATION_MS,
) => {
  const queue = jamRecordingStopQueue();
  const jobId = recordingStopJobId(recordingId);
  await queue.remove(jobId).catch(() => undefined);
  await queue.add(
    'stop',
    { jamPostId, recordingId },
    { jobId, delay: delayMs },
  );
};

export const cancelRecordingAutoStop = async (recordingId: string) => {
  const queue = jamRecordingStopQueue();
  await queue.remove(recordingStopJobId(recordingId)).catch(() => undefined);
};

export { jamRecordingStopQueue, jamRecordingStopWorker };
