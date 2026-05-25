import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { listPastGroupEventsFeed } from '@openpeeps/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const apiEndpoint = endpoint({ Output, Query, Param }).handle(
  async (params, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);
    return listPastGroupEventsFeed(
      event.context.authData,
      params.groupId,
      Query.parse(params),
    );
  },
);
