import { Endpoint, z } from 'sveltekit-api';
import { findPost } from '@openpeeps/core/posts';
import { publicPostSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '$lib/server/api/errors';
import { ensurePostCapabilities, serviceScopeMatches } from '$lib/server/auth';

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
    const isServiceAuthorized = serviceScopeMatches({
      authorization: event.locals.authorization,
      scopeLevel: undefined,
      resource: { type: 'jams', id: param.postId },
    });
    const mergedPost = await findPost(param.postId, event.locals.authData);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    if (!isServiceAuthorized) {
      await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);
    }

    return mergedPost;
  },
);
