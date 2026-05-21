import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { listPosts } from '@openpeeps/core/posts';
import { ensureAccess } from '$lib/server/auth';

export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Output = z.any().array();

export default new Endpoint({ Query, Output }).handle(
  async (query, event: RequestEvent) => {
    await ensureAccess(event);

    const posts = await listPosts(
      event.locals.authData,
      {
        start: query.start,
        limit: query.limit,
      },
    );

    return Output.parse(posts);
  },
);
