import type { MediaAttachment } from '@openpeeps/common/types';
import {
  findMediaAttachment,
  updateMediaAttachment,
} from '../mediaAttachments';
import { recordProcessingStats } from '../processingStats';
import { logger } from '../log';
import { mediaStorage, transcodeIncomingMedia, createPreview } from './index';

const log = logger('app:media:processing');

export const SYNC_PROCESSING_LIMIT = Number(
  process.env.MEDIA_SYNC_PROCESSING_LIMIT || 1024 * 1024,
);

export interface RunProcessingInput {
  mediaAttachmentId: string;
  file: File;
  thumbnail?: File;
}

export const runProcessing = async ({
  mediaAttachmentId,
  file,
  thumbnail,
}: RunProcessingInput): Promise<MediaAttachment> => {
  const startedAt = Date.now();
  const attachment = await findMediaAttachment(mediaAttachmentId);
  if (!attachment) {
    throw new Error(`MediaAttachment ${mediaAttachmentId} not found`);
  }

  const filetype = attachment.type;

  try {
    const storage = await mediaStorage();
    const transcodedFile = await transcodeIncomingMedia(filetype, file);

    const fileStorageKey = await transcodedFile
      .arrayBuffer()
      .then(storage.store);

    const normalizedFilename = encodeURIComponent(transcodedFile.name);
    const thumbnailFilename = `thumbnail-${normalizedFilename}${normalizedFilename.endsWith('.webp') ? '' : '.webp'}`;

    const preview = await createPreview(thumbnail || file);
    const previewStorageKey: string = await preview
      .arrayBuffer()
      .then(storage.store);

    const url = storage.getPath(fileStorageKey, normalizedFilename);
    const previewUrl = storage.getPath(previewStorageKey, thumbnailFilename);

    const updated = await updateMediaAttachment(mediaAttachmentId, {
      url,
      previewUrl,
      meta: {
        ...attachment.meta,
        mimetype: transcodedFile.type,
        size: transcodedFile.size,
      },
      status: 'ready',
      error: undefined,
    });

    const durationMs = Date.now() - startedAt;
    await recordProcessingStats({
      mediaAttachmentId,
      filesize: file.size,
      filetype,
      durationMs,
    }).catch((e) => log.error('Failed to record processing stats', e));

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(
      `Processing failed for media ${mediaAttachmentId}: ${message}`,
    );
    await updateMediaAttachment(mediaAttachmentId, {
      status: 'failed',
      error: message,
    }).catch((e) => log.error('Failed to mark media as failed', e));
    throw error;
  }
};
