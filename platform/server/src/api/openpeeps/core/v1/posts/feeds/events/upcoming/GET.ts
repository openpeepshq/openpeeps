import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listUpcomingEventsFeed } from '@openpeepshq/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);
    const parsed = Query.parse(params);
    const result = await listUpcomingEventsFeed(event.context.authData, parsed);
    return result;
  });
