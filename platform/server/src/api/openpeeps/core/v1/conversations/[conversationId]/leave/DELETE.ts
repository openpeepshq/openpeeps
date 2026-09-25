import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import {
  findPost,
  findLatestThreadPostId,
  findPostsForAuth,
  leaveConversation,
} from '@openpeepshq/core/posts';
import { successResponseSchema } from '@openpeepshq/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  conversationId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    const profile = await ensureLocalProfile(event);

    const post = await findPost(input.conversationId, event.context.authData);

    if (!post || post.visibility !== 'direct' || post.inReplyToId) {
      throw notFound(`Object with id ${input.conversationId}`);
    }

    await ensurePostCapabilities(event, post, ['core-posts-read']);

    // Verify the user is a participant in the conversation.
    const lastPostId = await findLatestThreadPostId(post.id);
    const [lastPost] =
      lastPostId === post.id
        ? [post]
        : await findPostsForAuth([lastPostId], event.context.authData);

    if (!lastPost?.audience?.some((p) => p.id === profile.id)) {
      throw forbidden();
    }

    await leaveConversation(post, profile);

    return { success: true };
  },
);
