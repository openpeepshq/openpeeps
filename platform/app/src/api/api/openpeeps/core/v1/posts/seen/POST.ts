import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findPost, markPostsSeen } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';

export const Input = z.object({
  postIds: z.string().array(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const posts = await Promise.all(input.postIds.map(async (postId) => {
      const post = await findPost(postId);

      if (!post) {
        throw notFound(`Object with id ${postId}`);
      }

      await ensurePostCapabilities(event, post, ['core-posts-read']);

      return post;
    }));

    await markPostsSeen(posts, profile);

    return { success: true };
  },
);
