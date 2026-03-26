import { Endpoint, z } from 'sveltekit-api';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { hub } from '@openpeeps/core/events';
import { findPost } from '@openpeeps/core/posts';

export const Param = z.object({
  postId: z.string(),
});
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-posts-announce']);

    const post = await findPost(input.postId);

    if (!post) throw notFound(`Post with id ${input.postId}`);

    await hub.emit('postAnnounced', post);

    return { success: true };
  },
);
