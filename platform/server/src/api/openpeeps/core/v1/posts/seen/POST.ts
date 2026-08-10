import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPost, markPostsSeen } from '@openpeepshq/core/posts';
import { successResponseSchema } from '@openpeepshq/common/types';

export const Input = z.object({
  postIds: z.string().array(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
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
