import { unlink } from 'node:fs/promises';
import type { MediaAttachment } from '@openpeeps/common/types';
import {
  findMediaAttachment,
  updateMediaAttachment,
} from '../mediaAttachments';
import { recordProcessingStats } from '../processingStats';
import { logger } from '../log';
import {
  mediaStorage,
  transcodeIncomingMedia,
  createPreview,
  storeFromPath,
  writeStorageToTemp,
  writeStreamToTemp,
} from './index';

const log = logger('app:media:processing');

export const SYNC_PROCESSING_LIMIT = Number(
  process.env.MEDIA_SYNC_PROCESSING_LIMIT || 1024 * 1024,
);

export interface RunProcessingInput {
  mediaAttachmentId: string;
  /**
   * Content-addressed storage key of the already-stored source bytes. Both the
   * HTTP sync path and the worker store the upload first, then hand off the
   * key — the bytes are streamed off disk here, never buffered.
   */
  sourceStorageKey: string;
  thumbnail?: File;
}

/**
 * Transcode + generate a preview for an attachment, working entirely with
 * on-disk temp files so a large upload is never held in memory. Source bytes
 * are streamed to a temp file, ffmpeg/sharp read and write files directly, and
 * the outputs are streamed back into storage. All temps are removed afterwards.
 */
export const runProcessing = async ({
  mediaAttachmentId,
  sourceStorageKey,
  thumbnail,
}: RunProcessingInput): Promise<MediaAttachment> => {
  const startedAt = Date.now();
  const attachment = await findMediaAttachment(mediaAttachmentId);
  if (!attachment) {
    throw new Error(`MediaAttachment ${mediaAttachmentId} not found`);
  }

  const filetype = attachment.type;
  const originalName = attachment.filename;
  const sourceMimetype = attachment.meta.mimetype ?? '';

  const temps = new Set<string>();
  try {
    const storage = await mediaStorage();

    const sourcePath = await writeStorageToTemp(sourceStorageKey, originalName);
    temps.add(sourcePath);

    const transcoded = await transcodeIncomingMedia(
      filetype,
      sourcePath,
      originalName,
      sourceMimetype,
    );
    if (transcoded.path !== sourcePath) temps.add(transcoded.path);
    const { key: fileStorageKey, size: storedSize } = await storeFromPath(
      transcoded.path,
    );

    let previewInputPath = sourcePath;
    let previewMimetype = sourceMimetype;
    let previewName = originalName;
    if (thumbnail) {
      previewInputPath = await writeStreamToTemp(
        thumbnail.stream(),
        thumbnail.name,
      );
      temps.add(previewInputPath);
      previewMimetype = thumbnail.type;
      previewName = thumbnail.name;
    }
    const preview = await createPreview(
      previewInputPath,
      previewMimetype,
      previewName,
    );
    if (preview.path !== sourcePath && preview.path !== previewInputPath) {
      temps.add(preview.path);
    }
    const { key: previewStorageKey } = await storeFromPath(preview.path);

    const normalizedFilename = encodeURIComponent(transcoded.filename);
    const thumbnailFilename = `thumbnail-${normalizedFilename}${normalizedFilename.endsWith('.webp') ? '' : '.webp'}`;

    const url = storage.getPath(fileStorageKey, normalizedFilename);
    const previewUrl = storage.getPath(previewStorageKey, thumbnailFilename);

    const updated = await updateMediaAttachment(mediaAttachmentId, {
      url,
      previewUrl,
      meta: {
        ...attachment.meta,
        mimetype: transcoded.mimetype,
        size: storedSize,
      },
      status: 'ready',
      error: undefined,
    });

    const durationMs = Date.now() - startedAt;
    await recordProcessingStats({
      mediaAttachmentId,
      filesize: attachment.meta.size ?? storedSize,
      filetype,
      durationMs,
    }).catch((e) => log.error('Failed to record processing stats', e));

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Processing failed for media ${mediaAttachmentId}: ${message}`);
    await updateMediaAttachment(mediaAttachmentId, {
      status: 'failed',
      error: message,
    }).catch((e) => log.error('Failed to mark media as failed', e));
    throw error;
  } finally {
    await Promise.all(
      [...temps].map((p) => unlink(p).catch(() => undefined)),
    );
  }
};
