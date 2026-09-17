import { endpoint, z } from '#lib/endpoint';
import { findPost, getConversationByStart } from '@openpeepshq/core/posts';
import { publicPostSchema } from '@openpeepshq/common/types';
import { notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import { isOneToOneWithBlocked, blockedPairIds } from '@openpeepshq/common/lib';

export const Param = z.object({
  conversationId: z.string(),
});

export const Output = publicPostSchema.array();

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    await ensureLocalProfile(event);
    const post = await findPost(param.conversationId, event.context.authData);

    if (!post) {
      throw notFound(`Object with id ${param.conversationId}`);
    }

    await ensurePostCapabilities(event, post, ['core-posts-read']);

    const viewer = event.context.currentProfile;
    if (isOneToOneWithBlocked(post, viewer, blockedPairIds(viewer))) {
      throw notFound(`Object with id ${param.conversationId}`);
    }

    const conversation = await getConversationByStart(
      post,
      event.context.authData,
    );

    return conversation;
  },
);
