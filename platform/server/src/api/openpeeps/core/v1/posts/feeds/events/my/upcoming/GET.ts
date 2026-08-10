import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listMyUpcomingEventsFeed } from '@openpeepshq/core/posts';
import { ensureLocalProfile } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureLocalProfile(event);
    return listMyUpcomingEventsFeed(event.context.authData, Query.parse(params));
  });
