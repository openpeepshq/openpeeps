import { endpoint, z } from '#lib/endpoint';
import {
  publicPostSchema,
  offsetInfiniteQueryParamsSchema,
} from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listHighlightsFeed } from '@openpeepshq/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema.extend({
  format: z.enum(['threaded', 'linear']).optional(),
});

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);
    return listHighlightsFeed(event.context.authData, Query.parse(params));
  },
);
