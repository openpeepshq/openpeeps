import { endpoint, z } from '#lib/endpoint';
import { findPost, getConversationByStart } from '@openpeepshq/core/posts';
import { publicPostSchema } from '@openpeepshq/common/types';
import { notFound } from '#lib/errors';
import {
  ensureLocalProfile,
  ensurePostCapabilities,
  ensureScope,
} from '#lib/auth';
import { isOneToOneWithBlocked, blockedPairIds } from '@openpeepshq/common/lib';

export const Param = z.object({
  conversationId: z.uuid(),
});

export const Query = z.object({
  message: z.uuid().optional(),
});

export const Output = publicPostSchema.array();

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
  async (param, event) => {
    await ensureLocalProfile(event);
    // The conversation is a direct message; require the conversations scope.
    await ensureScope(event, 'read', { type: 'conversations' });
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
      param.message ? { focusId: param.message } : undefined,
    );

    return conversation;
  },
);
