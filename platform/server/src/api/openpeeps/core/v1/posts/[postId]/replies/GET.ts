import { endpoint, z } from '#lib/endpoint';
import { findPost, replies } from '@openpeepshq/core/posts';
import { publicPostSchema } from '@openpeepshq/common/types';
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
    const mergedPost = await findPost(param.postId, event.context.authData);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);

    return replies(event.context.authData, mergedPost);
  },
);
