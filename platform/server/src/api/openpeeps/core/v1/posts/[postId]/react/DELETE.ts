import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPost, retractReaction } from '@openpeepshq/core/posts';
import {
  reactionDataSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';

export const Param = z.object({
  postId: z.string(),
});

export const Input = reactionDataSchema;

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const mergedPost = await findPost(input.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);

    const reactionData = reactionDataSchema.parse(input);

    await retractReaction(mergedPost, profile, reactionData);

    return { success: true };
  },
);
