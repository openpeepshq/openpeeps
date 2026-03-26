import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findPost, reactToPost } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';
import { reactionDataSchema } from '@openpeeps/common/types';

export const Param = z.object({
  postId: z.string(),
});

export const Input = reactionDataSchema;

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const reactionData = reactionDataSchema.parse(input);

    const mergedPost = await findPost(input.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-react']);

    await reactToPost(mergedPost, profile, reactionData);

    return { success: true };
  },
);
