import { Endpoint, z } from 'sveltekit-api';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { updateConfig } from '@openpeeps/core/config';

export const Input = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-customization-update']);
    await updateConfig(
      { content: { pinnedPost: input.postId } },
      'openpeeps',
      'community',
    );

    return { success: true };
  },
);
