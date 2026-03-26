import { Endpoint, z } from 'sveltekit-api';
import { modelSchema, mediaAttachmentDataSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '$lib/server/api/errors';
import { findMediaAttachment } from '@openpeeps/core/mediaAttachments';

export const Param = z.object({
  mediaAttachmentId: z.string(),
});

export const Output = modelSchema(mediaAttachmentDataSchema);

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(async (param) => {
  const mediaAttachment = await findMediaAttachment(param.mediaAttachmentId);

  if (!mediaAttachment) {
    throw notFound(`Object with id ${param.mediaAttachmentId}`);
  }

  return mediaAttachment;
});
