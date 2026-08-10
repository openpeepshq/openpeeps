import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';
import {
  type MediaProgressEvent,
  mediaProgressEventSchema,
} from '@openpeepshq/common/types';
import { findMediaAttachment } from '@openpeepshq/core/mediaAttachments';
import {
  getMediaProcessingMeta,
  subscribeToMediaProgress,
} from '@openpeepshq/core/media';
import { produceStream } from '#lib/sse';

export const Param = z.object({
  mediaAttachmentId: z.string(),
});

export const Stream = mediaProgressEventSchema;

export const Output = z.instanceof(ReadableStream);

export const Error = {
  404: notFound(),
};

const PROGRESS_CAP = 95;
const TICK_INTERVAL_MS = 1000;

const computeProgress = (
  status: 'processing' | 'ready' | 'failed' | undefined,
  meta?: { startedAt: number; estimatedDurationMs: number },
): { progressPercent: number; estimatedRemainingMs?: number } => {
  // Legacy attachments (no status field) and explicit `ready` are treated as
  // fully processed.
  if (!status || status === 'ready') {
    return { progressPercent: 100, estimatedRemainingMs: 0 };
  }
  if (status === 'failed') {
    return { progressPercent: 0, estimatedRemainingMs: 0 };
  }
  if (!meta || meta.estimatedDurationMs <= 0) {
    return { progressPercent: 0, estimatedRemainingMs: undefined };
  }
  const elapsed = Date.now() - meta.startedAt;
  const raw = (elapsed / meta.estimatedDurationMs) * 100;
  const progressPercent = Math.min(PROGRESS_CAP, Math.max(0, Math.floor(raw)));
  const estimatedRemainingMs = Math.max(0, meta.estimatedDurationMs - elapsed);
  return { progressPercent, estimatedRemainingMs };
};

export const apiEndpoint = endpoint({ Param, Stream, Output, Error }).handle(
  async ({ mediaAttachmentId }) =>
    produceStream<MediaProgressEvent>({
      start: async ({ emit, stop }) => {
        const tick = async () => {
          const doc = await findMediaAttachment(mediaAttachmentId);
          if (!doc) {
            stop();
            return;
          }
          const meta = await getMediaProcessingMeta(mediaAttachmentId);
          const { progressPercent, estimatedRemainingMs } = computeProgress(
            doc.status,
            meta,
          );
          emit({
            mediaAttachment: doc,
            progressPercent,
            estimatedRemainingMs,
          });
          if (!doc.status || doc.status === 'ready' || doc.status === 'failed') {
            stop();
          }
        };

        await tick();

        const interval = setInterval(() => {
          void tick();
        }, TICK_INTERVAL_MS);

        const unsubscribe = await subscribeToMediaProgress(
          mediaAttachmentId,
          () => {
            void tick();
          },
        );

        return async () => {
          clearInterval(interval);
          await unsubscribe();
        };
      },
    }),
);
