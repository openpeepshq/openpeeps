import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { deletePost, findPost } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToDelete = await findPost(input.postId);
    if (!postToDelete) {
      throw notFound(`Post with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, postToDelete, ['core-posts-delete']);

    await deletePost(postToDelete, profile);

    return { success: true };
  },
);
