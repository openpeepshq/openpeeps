import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listMyCurrentEventsFeed } from '@openpeeps/core/posts';
import { ensureLocalProfile } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;

export default new Endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureLocalProfile(event);
    return listMyCurrentEventsFeed(
      event.locals.authData,
      Query.parse(params),
    );
  },
);
