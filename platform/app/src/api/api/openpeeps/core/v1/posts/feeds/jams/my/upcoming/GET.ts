import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listMyUpcomingJamsFeed } from '@openpeeps/core/posts';
import { ensureLocalProfile } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;

export default new Endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    return listMyUpcomingJamsFeed(await ensureLocalProfile(event), Query.parse(params));
  });
