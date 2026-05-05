import { Endpoint, z } from 'sveltekit-api';
import { findPost, ancestors, descendents } from '@openpeeps/core/posts';
import { postContextSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '$lib/server/api/errors';
import { ensureProfileOrPublicCommunity } from '$lib/server/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = postContextSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {

    const profile = await ensureProfileOrPublicCommunity(event);

    const mergedPost = await findPost(param.postId, profile);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    return {
      ancestors: await ancestors(profile, mergedPost, 25),
      descendants: await descendents(profile, mergedPost, 25)
    };
  },
);
