import { endpoint } from '#lib/endpoint';
import {
  publicPostSchema,
  eventRangeQueryParamsSchema,
} from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listEventsInRange } from '@openpeepshq/core/posts';
import { ensureLocalProfile } from '#lib/auth';

export const Output = publicPostSchema.array();
export const Query = eventRangeQueryParamsSchema;

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureLocalProfile(event);
    const parsed = Query.parse(params);
    return listEventsInRange(event.context.authData, parsed, { mine: true });
  },
);
