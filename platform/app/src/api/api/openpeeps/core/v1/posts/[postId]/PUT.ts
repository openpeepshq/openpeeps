import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { publicPostSchema, postDataUnionSchema } from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { updatePost, findPost } from '@openpeeps/core/posts';

export const Input = postDataUnionSchema;
export const Output = publicPostSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Input, Output, Error }).handle(
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
