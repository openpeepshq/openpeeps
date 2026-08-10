import { endpoint, z } from '#lib/endpoint';
import {
  forbidden,
  notFound,
  unprocessableRequest,
} from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPost, vote } from '@openpeepshq/core/posts';
import { successResponseSchema } from '@openpeepshq/common/types';
import { answerSchema } from '@openpeepshq/common/types';

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

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
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
