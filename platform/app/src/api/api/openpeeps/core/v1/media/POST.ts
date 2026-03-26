import { Endpoint } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import {
  mediaAttachmentSchema,
  mediaStorageRequestSchema,
} from '@openpeeps/common/types';
import { createMediaAttachmentHandler } from '$lib/server/api/handlers/media/createAttachment';

export const Input = mediaStorageRequestSchema;
export const Output = mediaAttachmentSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  createMediaAttachmentHandler,
);
