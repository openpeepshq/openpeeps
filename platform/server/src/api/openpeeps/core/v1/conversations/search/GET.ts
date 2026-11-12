import { endpoint, z } from '#lib/endpoint';
import { directMessageSearchHitSchema } from '@openpeepshq/common/types';
import { blockedPairIds, isOneToOneWithBlocked } from '@openpeepshq/common/lib';
import { findPost, searchDirectMessages } from '@openpeepshq/core/posts';
import { notFound } from '#lib/errors';
import {
  ensureLocalProfile,
  ensurePostCapabilities,
  ensureScope,
} from '#lib/auth';

export const Query = z.object({
  q: z.string().trim().min(2).max(200),
  conversationId: z.uuid().optional(),
});

export const Output = directMessageSearchHitSchema.array();

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (query, event) => {
    await ensureLocalProfile(event);
    await ensureScope(event, 'read', { type: 'conversations' });
    const authData = event.context.authData;
    const post = query.conversationId
      ? await findPost(query.conversationId, authData)
      : undefined;
    if (query.conversationId) {
      if (!post || post.visibility !== 'direct') {
        throw notFound(`Object with id ${query.conversationId}`);
      }
      await ensurePostCapabilities(event, post, ['core-posts-read']);
      const viewer = event.context.currentProfile;
      if (isOneToOneWithBlocked(post, viewer, blockedPairIds(viewer))) {
        throw notFound(`Object with id ${query.conversationId}`);
      }
    }

    return searchDirectMessages(authData, query.q, {
      conversation: post?.visibility === 'direct' ? post : undefined,
    });
  },
);
