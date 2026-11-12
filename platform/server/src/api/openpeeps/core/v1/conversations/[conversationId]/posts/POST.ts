import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound, rethrowIfOpenpeepsError } from '#lib/errors';
import {
  publicPostSchema,
  postDataUnionSchema,
  postDataSchema,
  type PostData,
} from '@openpeepshq/common/types';
import {
  ensureLocalProfile,
  ensurePostCapabilities,
  ensureScope,
} from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import {
  createPost,
  findLatestOneToOnePostId,
  findLatestThreadPostId,
  findPost,
  findPostsForAuth,
} from '@openpeepshq/core/posts';
import { postCreationDataSchema } from '@openpeepshq/common/types';
import {
  isOneToOneDm,
  isBlockedPair,
  isConversationLeavePost,
} from '@openpeepshq/common/lib';

export const Input = postCreationDataSchema;
export const Output = publicPostSchema;
export const Param = z.object({
  conversationId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    // Sending a direct message requires the conversations scope.
    await ensureScope(event, 'write', { type: 'conversations' });

    const post = await findPost(input.conversationId);
    if (!post) {
      throw notFound(`Post with id ${input.conversationId}`);
    }

    if (isBlockedPair(profile, post.creatorId ?? post.profile?.id)) {
      throw forbidden('error.cannotInteractBlocked');
    }

    await ensurePostCapabilities(event, post, ['core-posts-reply']);

    // 1:1 conversations can span several roots; reply to the newest post
    // across all of them so the message lands at the end of the merged
    // conversation and leaver-exclusion keeps working.
    const lastPostId = isOneToOneDm(post)
      ? await findLatestOneToOnePostId(post)
      : await findLatestThreadPostId(post.id);
    const [lastPost] =
      lastPostId === post.id
        ? [post]
        : await findPostsForAuth([lastPostId], event.context.authData);

    if (!lastPost?.audience?.map((m) => m.id).includes(profile.id)) {
      throw forbidden();
    }

    // Detect users who have left: leaveConversation ends the thread with
    // a reply that leaves the leaver out of the audience. Block the
    // leaver and exclude them from the inherited audience so future
    // replies don't notify them.
    const lastPostAuthorId = lastPost?.profile?.id;
    const lastPostAuthorLeft =
      !!lastPostAuthorId && isConversationLeavePost(lastPost);

    if (lastPostAuthorLeft && lastPostAuthorId === profile.id) {
      throw forbidden();
    }

    const baseAudience: { id: string }[] =
      input?.audience ?? lastPost?.audience ?? [];
    const audience =
      lastPostAuthorLeft && baseAudience.length
        ? baseAudience.filter((p) => p.id !== lastPostAuthorId)
        : baseAudience;

    const postData = postDataUnionSchema.parse(input.data);
    const object: PostData = postDataSchema.parse({
      ...input,
      creatorId: profile.id,
      visibility: 'direct',
    });

    return await createPost(postData, profile, object, {
      inReplyToId: lastPost.id,
      audience: (audience.length ? audience : null) as never,
    }).catch(rethrowIfOpenpeepsError);
  },
);
