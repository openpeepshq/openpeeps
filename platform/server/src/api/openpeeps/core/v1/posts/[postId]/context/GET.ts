import { endpoint, z } from '#lib/endpoint';
import { findPost, getPostContext } from '@openpeepshq/core/posts';
import { postContextSchema } from '@openpeepshq/common/types';
import { notFound, forbidden } from '#lib/errors';
import {
  ensurePostCapabilities,
  ensureProfileOrPublicCommunity,
} from '#lib/auth';

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

    // The thread reveals the post and every reply in it; drafts are only
    // readable by their creator, so the same read gate as the single GET
    // applies here.
    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);

    return getPostContext(mergedPost, event.context.authData);
  },
);
