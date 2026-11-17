import { endpoint, z } from '#lib/endpoint';
import {
  publicPostSchema,
  eventRangeQueryParamsSchema,
} from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listEventsInRange } from '@openpeepshq/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = eventRangeQueryParamsSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const apiEndpoint = endpoint({ Output, Query, Param }).handle(
  async (params, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);
    const parsed = Query.parse(params);
    return listEventsInRange(event.context.authData, parsed, {
      groupId: params.groupId,
    });
  },
);
