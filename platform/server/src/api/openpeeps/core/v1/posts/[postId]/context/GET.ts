import { endpoint, z } from '#lib/endpoint';
import { findPost, getPostContext } from '@openpeeps/core/posts';
import { postContextSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '#lib/errors';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = postContextSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    await ensureProfileOrPublicCommunity(event);

    const mergedPost = await findPost(param.postId, event.context.authData);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    return getPostContext(mergedPost, event.context.authData);
  },
);
