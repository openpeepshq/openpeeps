import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  type PostWithMeta,
  publicPostSchema,
  type PostData,
} from '@openpeeps/common/types';
import { ensureGroupCapabilities, ensureLocalProfile, ensureRoleCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { createPost, findPost } from '@openpeeps/core/posts';

export const Output = publicPostSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToRepost: PostWithMeta | undefined = await findPost(input.postId);

    if (!postToRepost) {
      throw notFound(`Post with id ${input.postId}`);
    }

    if (postToRepost.group) {
      await ensureGroupCapabilities(event, [`core-posts-create-${postToRepost.type}`], postToRepost.group);
    } else {
      await ensureRoleCapabilities(event, [`core-posts-create-${postToRepost.type}-${postToRepost.visibility}`]);
    }

    const post: PostData = {
      type: 'note',
      visibility: postToRepost.visibility,
    };

    return await createPost({ type: 'note' }, profile, post, {
      repostId: postToRepost?.id,
      groupId: postToRepost?.groupId || undefined,
      audience: postToRepost?.audience || undefined,
    });
  },
);
