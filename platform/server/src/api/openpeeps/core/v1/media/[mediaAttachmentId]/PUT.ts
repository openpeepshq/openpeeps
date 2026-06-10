import { endpoint, z } from '#lib/endpoint';
import { mediaAttachmentDataSchema, mediaAttachmentSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '#lib/errors';
import { updateMediaAttachment } from '@openpeeps/core/mediaAttachments';
import { ensureLocalProfile } from '#lib/auth';

export const Param = z.object({
  mediaAttachmentId: z.string(),
});
export const Input = mediaAttachmentDataSchema.partial();

export const Output = mediaAttachmentSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureLocalProfile(event);

    const result = await updateMediaAttachment(
      input.mediaAttachmentId,
      Input.parse(input),
    );
    if (!result) {
      throw notFound();
    } else {
      return result;
    }
  },
);
