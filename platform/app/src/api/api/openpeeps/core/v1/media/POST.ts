import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import {
  type MediaAttachment,
  type MediaStorageRequest,
  mediaAttachmentSchema,
  mediaStorageRequestSchema,
} from '@openpeeps/common/types';
import { createMediaAttachmentHandler } from '$lib/server/api/handlers/media/createAttachment';

export const Input = mediaStorageRequestSchema;
// Handler may return either a typed `MediaAttachment` (status 200, fully
// processed for files < SYNC_PROCESSING_LIMIT) or a raw `Response` with
// status 202 carrying a partial `MediaAttachment` body while a background
// worker finishes processing. sveltekit-api passes raw `Response`s through
// unchanged.
export const Output = mediaAttachmentSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  createMediaAttachmentHandler as unknown as (
    input: MediaStorageRequest,
    evt: RequestEvent,
  ) => Promise<MediaAttachment>,
);
