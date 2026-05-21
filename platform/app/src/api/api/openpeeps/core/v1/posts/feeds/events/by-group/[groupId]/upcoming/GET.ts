import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listUpcomingGroupEventsFeed } from '@openpeeps/core/posts';
import { ensureAccess } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;
export const Param = z.object({
  groupId: z.string(),
});

export default new Endpoint({ Output, Query, Param }).handle(
  async (params, event: RequestEvent) => {
    await ensureAccess(event);
    return listUpcomingGroupEventsFeed(event.locals.authData, params.groupId, Query.parse(params));
  },
);
