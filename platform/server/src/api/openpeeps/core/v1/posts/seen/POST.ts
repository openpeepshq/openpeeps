import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPostsForAuth, markPostsSeen } from '@openpeepshq/core/posts';
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
    const uniqueIds = Array.from(new Set(input.postIds));
    const posts = await findPostsForAuth(uniqueIds, event.context.authData);

    if (posts.length !== uniqueIds.length) {
      const found = new Set(posts.map((post) => post.id));
      const missing = uniqueIds.find((id) => !found.has(id));
      throw notFound(`Object with id ${missing}`);
    }

    for (const post of posts) {
      await ensurePostCapabilities(event, post, ['core-posts-read']);
    }

    await markPostsSeen(posts, profile);

    return { success: true };
  },
);
