import { Endpoint, z } from 'sveltekit-api';
import { findPost } from '@openpeeps/core/posts';
import { publicPostSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '$lib/server/api/errors';
import { ensurePostCapabilities, scopeMatches } from '$lib/server/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = publicPostSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const mergedPost = await findPost(param.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    const isServiceAuthorized = scopeMatches({
      authorization: event.locals.authorization,
      scope: undefined,
      resource: { type: 'jam', id: param.postId },
    });

    if (!isServiceAuthorized) {
      await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);
    }

    return mergedPost;
  },
);
