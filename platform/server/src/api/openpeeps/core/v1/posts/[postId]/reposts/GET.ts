import { endpoint, z } from '#lib/endpoint';
import { findPost, reposts } from '@openpeeps/core/posts';
import { publicPostSchema, type PostWithMeta } from '@openpeeps/common/types';
import { notFound, forbidden } from '#lib/errors';
import { ensurePostCapabilities } from '#lib/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = publicPostSchema.array();

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const mergedPost = await findPost(param.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);

    // `reposts(...)` returns `DbPost[]`; `PublicPost`/`PostWithMeta` share
    // overlapping shape but TS conservatively forbids a direct cast.
    return reposts(mergedPost) as unknown as PostWithMeta[];
  },
);
