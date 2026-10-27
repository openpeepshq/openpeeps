import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound, rethrowIfOpenpeepsError } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPost, reactToPost } from '@openpeepshq/core/posts';
import { successResponseSchema } from '@openpeepshq/common/types';
import { reactionDataSchema } from '@openpeepshq/common/types';
import { isBlockedPair } from '@openpeepshq/common/lib';

export const Param = z.object({
  postId: z.string(),
});

export const Input = reactionDataSchema;

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const reactionData = reactionDataSchema.parse(input);

    const mergedPost = await findPost(input.postId);

    if (!mergedPost) {
      throw notFound(`Object with id ${input.postId}`);
    }

    if (
      isBlockedPair(profile, mergedPost.creatorId ?? mergedPost.profile?.id)
    ) {
      throw forbidden('error.cannotInteractBlocked');
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-react']);

    await reactToPost(mergedPost, profile, reactionData).catch(
      rethrowIfOpenpeepsError,
    );

    return { success: true };
  },
);
