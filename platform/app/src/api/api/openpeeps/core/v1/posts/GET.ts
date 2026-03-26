import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { listPosts } from '@openpeeps/core/posts';
import { ensureProfileOrPublicCommunity } from '$lib/server/auth';

export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Output = z.any().array();

export default new Endpoint({ Query, Output }).handle(
  async (query, event: RequestEvent) => {
    const currentProfile = await ensureProfileOrPublicCommunity(event);

    const posts = await listPosts(
      currentProfile,
      {
        start: query.start,
        limit: query.limit,
      },
    );

    return Output.parse(posts);
  },
);
