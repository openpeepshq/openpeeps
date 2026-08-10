import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { publicPostSchema, postDataUnionSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { updatePost, findPost } from '@openpeepshq/core/posts';

export const Input = postDataUnionSchema;
export const Output = publicPostSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToUpdate = await findPost(input.postId);

    if (!postToUpdate) {
      throw notFound(`Post with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, postToUpdate, ['core-posts-update']);

    const postData = postDataUnionSchema.parse(input);

    return await updatePost(postToUpdate, profile, postData);
  },
);
