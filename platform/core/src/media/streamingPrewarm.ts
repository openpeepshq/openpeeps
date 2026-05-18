import type { MediaStream } from '@openpeeps/common/types';
import { hub } from '../events';
import { logger } from '../log';
import {
  buildStream,
  ensureStreamDir,
  getStreamStatus,
  parseLocalStorageUrl,
  recordStreamAccess,
} from './streaming';
import { mediaStreamingQueue } from './streamingJobs';

const log = logger('app:media:streamingPrewarm');

/**
 * Idempotent helper that ensures an HLS transcoding job exists for the given
 * `storageId`. Three cases:
 *
 * - If the stream is already on disk in any state (`ready`, `processing`, or
 *   `error`), returns the current status without enqueuing.
 * - Otherwise, creates the stream directory and enqueues a fresh transcoding
 *   job, defensively removing any stale BullMQ entry that would otherwise be
 *   silently deduplicated by `jobId`.
 *
 * Used by both the on-demand POST endpoint and the `postCreated`
 * pre-warm handler so the two paths share identical "is this stream really
 * being created right now?" semantics.
 */
export const ensureStreamingJob = async (
  storageId: string,
): Promise<MediaStream> => {
  // Refresh the last-access marker so the daily cleanup job doesn't evict a
  // stream that someone just expressed interest in. Fire-and-forget and
  // debounced; safe to call from many sites.
  void recordStreamAccess(storageId);

  const existing = await getStreamStatus(storageId);
  if (existing) {
    return { storageId, ...existing };
  }

  // Create the directory before enqueueing so any subsequent caller hitting
  // this code path immediately observes `processing` via `getStreamStatus`
  // rather than racing to enqueue a duplicate job.
  await ensureStreamDir(storageId);

  const queue = mediaStreamingQueue();
  const jobId = `stream:${storageId}`;
  // Adding a job whose id already exists is a silent no-op in BullMQ. If a
  // previous attempt failed and is being kept around for visibility (see the
  // `removeOnFail` config), the new add would be discarded and the directory
  // would stay stuck in `processing` forever. Removing first is idempotent —
  // a currently-locked (active) job rejects removal which is fine; that
  // means another worker is already on it and the directory check on the
  // next POST will report it as `processing`.
  await queue.remove(jobId).catch(() => undefined);
  await queue.add('transcode', { storageId }, { jobId });

  return (await buildStream(storageId)) ?? { storageId, status: 'processing' };
};

interface PrewarmableAttachment {
  type?: string;
  url?: string;
  status?: string;
}

interface PrewarmablePostShape {
  id?: string;
  data?: { attachments?: PrewarmableAttachment[] } & Record<string, unknown>;
}

interface PrewarmableJamRecordingShape {
  id?: string;
  attachment?: PrewarmableAttachment;
}

/**
 * Pre-warms HLS streams for any local-storage-hosted videos in the given
 * attachments. Federated videos and non-video attachments are silently
 * skipped.
 */
const prewarmVideoAttachments = async (
  attachments: PrewarmableAttachment[],
  context: string,
): Promise<void> => {
  for (const attachment of attachments) {
    if (!attachment || attachment.type !== 'video' || !attachment.url) {
      continue;
    }
    try {
      const storageId = await parseLocalStorageUrl(attachment.url);
      if (!storageId) {
        // Federated or otherwise non-local — nothing to pre-warm.
        continue;
      }
      const result = await ensureStreamingJob(storageId);
      log.info(`Prewarmed HLS for ${context} attachment ${storageId}: ${result.status}`);
    } catch (e) {
      // A single bad attachment shouldn't block prewarming siblings.
      log.warn(
        `Failed to prewarm HLS for ${context} attachment ${
          attachment.url ?? '?'
        }: ${(e as Error).message}`,
      );
    }
  }
};

/**
 * Walks the attachments on a freshly-created post and pre-warms HLS streams
 * for any local-storage-hosted videos, so that by the time anyone tries to
 * play them the transcoded ladder is already (or nearly) ready.
 */
export const prewarmPostStreams = async (rawPost: unknown): Promise<void> => {
  const post = rawPost as PrewarmablePostShape | undefined;
  const attachments = post?.data?.attachments;
  if (!attachments || attachments.length === 0) return;

  await prewarmVideoAttachments(attachments, `post ${post?.id ?? '?'}`);
};

/**
 * Pre-warms HLS for a completed jam recording's video attachment as soon as
 * the egress upload lands, so playback is ready before anyone opens the
 * recording post.
 */
export const prewarmJamRecordingStream = async (
  rawRecording: unknown,
): Promise<void> => {
  const recording = rawRecording as PrewarmableJamRecordingShape | undefined;
  const attachment = recording?.attachment;
  if (!attachment) return;

  await prewarmVideoAttachments(
    [attachment],
    `jam recording ${recording?.id ?? '?'}`,
  );
};

/**
 * Registers event handlers that pre-warm HLS streams for post videos and
 * completed jam recordings. Uses `hub.once` (BullMQ-backed) so the work
 * survives worker restarts.
 *
 * Should be invoked exactly once at worker boot.
 */
export const registerStreamingPrewarmHandlers = (): void => {
  hub.once('postCreated', (post) => prewarmPostStreams(post));
  hub.once('jamRecordingCompleted', (recording) =>
    prewarmJamRecordingStream(recording),
  );
};
