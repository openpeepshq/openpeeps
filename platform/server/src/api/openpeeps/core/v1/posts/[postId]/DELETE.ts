import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { deletePost, findPost } from '@openpeeps/core/posts';
import { publicPostSchema, successResponseSchema } from '@openpeeps/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToDelete = publicPostSchema.parse(await findPost(input.postId));

    if (!postToDelete) {
      throw notFound(`Post with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, postToDelete, ['core-posts-delete']);

    await deletePost(postToDelete, profile);

    return { success: true };
  },
);
