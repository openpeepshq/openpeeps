import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { updateConfigValues } from '@openpeepshq/core/config';

export const Input = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-customization-update']);
    await updateConfigValues(
      { content: { pinnedPost: input.postId } },
      'openpeeps',
      'community',
    );

    return { success: true };
  },
);
