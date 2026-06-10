import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import {
  type MediaAttachment,
  type MediaStorageRequest,
  getAttachmentType,
} from '@openpeeps/common';
import {
  mediaProcessingQueue,
  mediaStorage,
  runProcessing,
  SYNC_PROCESSING_LIMIT,
} from '@openpeeps/core/media';
import { createMediaAttachment } from '@openpeeps/core/mediaAttachments';

export const createMediaAttachmentHandler = async (
  mediaStorageRequest: MediaStorageRequest,
  event: RequestEvent,
): Promise<MediaAttachment | Response> => {
  await ensureLocalProfile(event);
  const storage = await mediaStorage();

  const { description, focus, file, thumbnail, usage } = mediaStorageRequest;

  let focusMeta: { x: number; y: number } | undefined;
  if (focus) {
    const [x, y] = focus.split(',').map(Number);
    focusMeta = { x, y };
  }

  const type = getAttachmentType(file);

  // Stream the upload straight to disk via the storage backend instead of
  // first materialising the whole payload as an ArrayBuffer in memory. The
  // streamed `size` is authoritative — riddl 0.2.4 streams multipart file
  // parts to temp files on disk, so `file.stream()` carries the real bytes.
  const { key: fileStorageKey, size } = await storage.storeStream(
    file.stream() as unknown as Parameters<typeof storage.storeStream>[0],
  );

  const normalizedFilename = encodeURIComponent(file.name);
  const url = storage.getPath(fileStorageKey, normalizedFilename);

  const attachment = await createMediaAttachment({
    url,
    previewUrl: null,
    textUrl: null,
    filename: file.name,
    type,
    meta: {
      usage,
      ...(focusMeta ? { focus: focusMeta } : {}),
      mimetype: file.type,
      size,
    },
    description,
    status: 'processing',
  });

  if (size < SYNC_PROCESSING_LIMIT) {
    return runProcessing({
      mediaAttachmentId: attachment.id,
      sourceStorageKey: fileStorageKey,
      thumbnail,
    });
  }

  await mediaProcessingQueue().add('process', {
    mediaAttachmentId: attachment.id,
    fileStorageKey,
    filename: file.name,
    mimetype: file.type,
  });

  return new Response(JSON.stringify(attachment), {
    status: 202,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
