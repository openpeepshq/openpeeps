import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import {
  findPost,
  findLatestConversationPost,
  retractReaction,
} from '@openpeepshq/core/posts';
import {
  reactionDataSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';

export const Param = z.object({
  postId: z.string(),
});

// Reaction is optional: pre-picker clients retract without a body and expect
// the legacy like removed.
export const Input = reactionDataSchema.partial();

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

    // Leavers stay in the audience of older messages; only the audience of
    // the latest conversation post defines current participants.
    if (mergedPost.visibility === 'direct') {
      const lastPost = await findLatestConversationPost(
        mergedPost,
        event.context.authData,
      );
      if (!lastPost?.audience?.some((p) => p.id === profile.id)) {
        throw forbidden();
      }
    }

    const reactionData = reactionDataSchema.partial().parse(input);

    await retractReaction(mergedPost, profile, {
      reaction: reactionData.reaction ?? AP_LIKE_REACTION,
    });

    return { success: true };
  },
);
