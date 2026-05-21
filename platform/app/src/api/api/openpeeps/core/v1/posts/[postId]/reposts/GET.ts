import { Endpoint, z } from 'sveltekit-api';
import type { PostWithMeta } from '@openpeeps/common/types';
import { findPost, reposts } from '@openpeeps/core/posts';
import { publicPostSchema } from '@openpeeps/common/types';
import { notFound, forbidden } from '$lib/server/api/errors';
import { ensurePostCapabilities } from '$lib/server/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = publicPostSchema.array();

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const mergedPost = await findPost(param.postId, event.locals.authData);

    if (!mergedPost) {
      throw notFound(`Object with id ${param.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);

    const reposted = await reposts(mergedPost, event.locals.authData);
    const repostedWithMeta = await Promise.all(
      reposted.map((post) => findPost(post.id, event.locals.authData)),
    );

    return repostedWithMeta.filter(
      (post): post is PostWithMeta => Boolean(post),
    );
  },
);
