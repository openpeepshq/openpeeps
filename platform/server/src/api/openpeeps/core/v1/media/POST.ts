import { endpoint } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import {
  mediaAttachmentSchema,
  mediaStorageRequestSchema,
} from '@openpeeps/common/types';
import { createMediaAttachmentHandler } from '#lib/handlers/media/createAttachment';

export const Input = mediaStorageRequestSchema;
export const Output = mediaAttachmentSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  createMediaAttachmentHandler,
);
