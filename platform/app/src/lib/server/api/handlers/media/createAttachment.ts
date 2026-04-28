import type { RequestEvent } from '@sveltejs/kit';
import { ensureLocalProfile } from '$lib/server/auth';
import {
  type MediaAttachment,
  type MediaStorageRequest,
  getAttachmentType,
} from '@openpeeps/common';
import { createPreview, mediaStorage, transcodeIncomingMedia } from '@openpeeps/core/media';
import { createMediaAttachment } from '@openpeeps/core/mediaAttachments';

export const createMediaAttachmentHandler = async (
  mediaStorageRequest: MediaStorageRequest,
  event: RequestEvent,
): Promise<MediaAttachment> => {
  await ensureLocalProfile(event);
  const storage = await mediaStorage();

  const { description, focus, file, thumbnail, usage } = mediaStorageRequest;

  const type = getAttachmentType(file);

  const transcodedFile: File = await transcodeIncomingMedia(type, file);
  const previewInput = thumbnail || transcodedFile;
  const previewPromise = createPreview(previewInput);
  const fileStorageKeyPromise = transcodedFile.arrayBuffer().then(storage.store);

  const normalizedFilename = encodeURIComponent(transcodedFile.name);

  const thumbnailFilename = `thumbnail-${normalizedFilename}${normalizedFilename.endsWith('.webp') ? '' : '.webp'}`;

  const preview = await previewPromise;
  const fileStorageKey = await fileStorageKeyPromise;
  const previewStorageKey =
    preview === transcodedFile
      ? fileStorageKey
      : await preview.arrayBuffer().then(storage.store);

  const url = storage.getPath(fileStorageKey, normalizedFilename);
  const previewUrl = storage.getPath(previewStorageKey, thumbnailFilename);

  return createMediaAttachment({
    url,
    previewUrl,
    textUrl: null,
    filename: file.name,
    type,
    meta: {
      usage,
      focus,
      mimetype: transcodedFile.type,
      size: transcodedFile.size,
    },
    description,
  });
};
