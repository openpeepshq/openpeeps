import { endpoint, z } from '#lib/endpoint';
import { findPost } from '@openpeepshq/core/posts';
import { publicPostSchema } from '@openpeepshq/common/types';
import { notFound, forbidden } from '#lib/errors';
import { ensurePostCapabilities, scopeMatches } from '#lib/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = publicPostSchema;

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

    const isServiceAuthorized = scopeMatches({
      authorization: event.context.authorization,
      scope: undefined,
      resource: { type: 'jam', id: param.postId },
    });

    if (!isServiceAuthorized) {
      await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);
    }

    return mergedPost;
  },
);
