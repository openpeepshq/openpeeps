import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { listPosts } from '@openpeepshq/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Output = z.any().array();

export const apiEndpoint = endpoint({ Query, Output }).handle(
  async (query, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);

    const posts = await listPosts(event.context.authData, {
      start: query.start,
      limit: query.limit,
    });

    return Output.parse(posts);
  },
);
