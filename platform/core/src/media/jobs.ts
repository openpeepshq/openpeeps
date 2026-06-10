import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import {
  findMediaAttachment,
  updateMediaAttachment,
} from '../mediaAttachments';
import { estimateProcessingDuration } from '../processingStats';
import { disconnect, getConnection, getSharedConnection } from '../redis/connection';
import { runProcessing } from './processing';

const log = logger('app:media:jobs');

export interface MediaProcessingJobData {
  mediaAttachmentId: string;
  fileStorageKey: string;
  filename: string;
  mimetype: string;
}

export const mediaProcessingMetaKey = (mediaAttachmentId: string) =>
  `media:processing:${mediaAttachmentId}`;
export const mediaProgressChannel = (mediaAttachmentId: string) =>
  `media:progress:${mediaAttachmentId}`;

export interface MediaProcessingMeta {
  startedAt: number;
  estimatedDurationMs: number;
}

export const setMediaProcessingMeta = async (
  mediaAttachmentId: string,
  meta: MediaProcessingMeta,
) => {
  const conn = await getSharedConnection();
  await conn.hSet(mediaProcessingMetaKey(mediaAttachmentId), {
    startedAt: String(meta.startedAt),
    estimatedDurationMs: String(meta.estimatedDurationMs),
  });
  await conn.expire(mediaProcessingMetaKey(mediaAttachmentId), 60 * 60);
};

export const getMediaProcessingMeta = async (
  mediaAttachmentId: string,
): Promise<MediaProcessingMeta | undefined> => {
  const conn = await getSharedConnection();
  const raw = await conn.hGetAll(mediaProcessingMetaKey(mediaAttachmentId));
  if (!raw || !raw.startedAt) {
    return undefined;
  }
  return {
    startedAt: Number(raw.startedAt),
    estimatedDurationMs: Number(raw.estimatedDurationMs) || 0,
  };
};

export const clearMediaProcessingMeta = async (mediaAttachmentId: string) => {
  const conn = await getSharedConnection();
  await conn.del(mediaProcessingMetaKey(mediaAttachmentId));
};

export const publishMediaProgress = async (
  mediaAttachmentId: string,
  message: string = 'updated',
) => {
  const conn = await getSharedConnection();
  await conn.publish(mediaProgressChannel(mediaAttachmentId), message);
};

export const subscribeToMediaProgress = async (
  mediaAttachmentId: string,
  onMessage: (message: string) => void | Promise<void>,
) => {
  const conn = await getConnection();
  await conn.subscribe(mediaProgressChannel(mediaAttachmentId), (message) => {
    void onMessage(message);
  });
  return () => disconnect(conn);
};

const [mediaProcessingQueue, mediaProcessingWorker] = queueAndWorker<
  MediaProcessingJobData,
  void
>(
  'media-processing',
  async (job) => {
    const { mediaAttachmentId, fileStorageKey } = job.data;
    const attachment = await findMediaAttachment(mediaAttachmentId);
    if (!attachment) {
      throw new Error(
        `MediaAttachment ${mediaAttachmentId} not found in worker`,
      );
    }
    const filesize = attachment.meta.size ?? 0;
    const estimatedDurationMs = await estimateProcessingDuration({
      filetype: attachment.type,
      filesize,
    });
    await setMediaProcessingMeta(mediaAttachmentId, {
      startedAt: Date.now(),
      estimatedDurationMs,
    });
    await publishMediaProgress(mediaAttachmentId, 'started');

    try {
      await runProcessing({
        mediaAttachmentId,
        sourceStorageKey: fileStorageKey,
      });
      await publishMediaProgress(mediaAttachmentId, 'ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(
        `Media processing job failed for ${mediaAttachmentId}: ${message}`,
      );
      // `runProcessing` marks the doc as failed itself, but errors that happen
      // outside of it (e.g. storage fetch) would otherwise leave it stuck in
      // `processing`. Update is idempotent so calling it twice is safe.
      await updateMediaAttachment(mediaAttachmentId, {
        status: 'failed',
        error: message,
      }).catch((e) =>
        log.error('Failed to mark media as failed in worker', e),
      );
      await publishMediaProgress(mediaAttachmentId, 'failed');
      throw error;
    } finally {
      await clearMediaProcessingMeta(mediaAttachmentId).catch((e) =>
        log.error('Failed to clear processing meta', e),
      );
    }
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export { mediaProcessingQueue, mediaProcessingWorker };
