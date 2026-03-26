import { Endpoint, z } from 'sveltekit-api';
import {
  forbidden,
  notFound,
  unprocessableRequest,
} from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findPost, vote } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';
import { answerSchema } from '@openpeeps/common/types';

export const Param = z.object({
  postId: z.string(),
});

export const Input = answerSchema;

export const Output = successResponseSchema;

export const Error = {
  409: unprocessableRequest(),
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const answer = answerSchema.parse(input);

    const mergedPost = await findPost(input.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${input.postId}`);
    }

    if (mergedPost.type !== 'question') {
      throw unprocessableRequest(
        `Post with id ${mergedPost.id} is not of type 'question'`,
      );
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-vote']);

    await vote(profile, mergedPost, answer);

    return { success: true };
  },
);
