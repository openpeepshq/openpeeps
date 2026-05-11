import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { listLocalFeed } from '@openpeeps/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => listLocalFeed(await ensureProfileOrPublicCommunity(event), Query.parse(params))
);
