import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  publicPostSchema,
  postDataUnionSchema,
  postDataSchema,
  type PostData,
} from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createPost, descendents, findPost } from '@openpeeps/core/posts';
import { postCreationDataSchema } from '@openpeeps/common/types';

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

    const post = await findPost(input.conversationId);

    if (!post) {
      throw notFound(`Post with id ${input.conversationId}`);
    }

    await ensurePostCapabilities(event, post, ['core-posts-reply']);

    const lastPost = await descendents(event.context.authData, post, 9999).then(
      (conversation) => conversation[0] ?? post,
    );

    if (!lastPost?.audience?.map((m) => m.id).includes(profile.id)) {
      throw forbidden();
    }

    const postData = postDataUnionSchema.parse(input.data);
    const object: PostData = postDataSchema.parse(
      { ...input, creatorId: profile.id, visibility: 'direct' }
    );
    const inReplyToId = lastPost.id;
    const audience = input?.audience;

    return await createPost(postData, profile, object, {
      inReplyToId,
      audience: audience || undefined,
    });
  },
);
