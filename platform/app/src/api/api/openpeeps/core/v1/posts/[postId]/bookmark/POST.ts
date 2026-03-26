import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findPost, bookmarkPost } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';

export const Param = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const mergedPost = await findPost(input.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);

    await bookmarkPost(mergedPost, profile);

    return { success: true };
  },
);
