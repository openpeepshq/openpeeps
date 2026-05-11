import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { listPastEventsFeed } from '@openpeeps/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    return listPastEventsFeed(await ensureProfileOrPublicCommunity(event), Query.parse(params));
  });
