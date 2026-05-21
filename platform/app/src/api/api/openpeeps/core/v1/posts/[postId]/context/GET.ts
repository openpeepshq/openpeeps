import { Endpoint, z } from 'sveltekit-api';
import { findPost, ancestors, descendents } from '@openpeeps/core/posts';
import { postContextSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '$lib/server/api/errors';
import { ensureAccess } from '$lib/server/auth';

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

    await ensureAccess(event);

    const mergedPost = await findPost(param.postId, event.locals.authData);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    return {
      ancestors: await ancestors(event.locals.authData, mergedPost, 25),
      descendants: await descendents(event.locals.authData, mergedPost, 25)
    };
  },
);
