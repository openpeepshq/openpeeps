import { endpoint, z } from '#lib/endpoint';
import { findPost, getConversationByStart } from '@openpeeps/core/posts';
import { publicPostSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '#lib/errors';
import { canReadMessage } from '@openpeeps/core/auth';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';

export const Param = z.object({
  conversationId: z.string(),
});

export const Output = publicPostSchema.array();

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const post = await findPost(param.conversationId);

    if (!post) {
      throw notFound(`Object with id ${param.conversationId}`);
    }

    await ensurePostCapabilities(event, post, ['core-posts-read']);

    const profile = await ensureLocalProfile(event);

    const conversation = await getConversationByStart(post, profile);

    if (!canReadMessage(conversation[0], profile)) {
      throw forbidden();
    }
    return conversation;
  },
);
