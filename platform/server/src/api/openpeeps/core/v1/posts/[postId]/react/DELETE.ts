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
  reactionEmojiSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';

export const Param = z.object({
  postId: z.string(),
});

// DELETE carries no body (Riddl's parseBody returns {} for DELETE), so the
// reaction travels as a query parameter; omitting it retracts the legacy
// plain like for pre-picker clients.
//
// Contract (write-path-only gate, signed in round 16): retraction is
// deliberately NOT checked against the community's allowed set — only the
// schema (a valid emoji). POST /react validates new attachments against the
// configured set; anything attached earlier stays retractable after it is
// removed from that set, so this endpoint stays asymmetric with POST on
// purpose (an orphaned emoji's only removal path is a retraction).
export const Query = z.object({
  reaction: reactionEmojiSchema.optional(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
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

    await retractReaction(mergedPost, profile, {
      // A query-less DELETE is the pre-picker contract: retract the plain like.
      reaction: input.reaction ?? AP_LIKE_REACTION,
    });

    return { success: true };
  },
);
