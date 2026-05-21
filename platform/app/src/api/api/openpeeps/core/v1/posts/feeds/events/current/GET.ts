import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema, offsetInfiniteQueryParamsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listCurrentEventsFeed } from '@openpeeps/core/posts';
import { ensureAccess } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Query = offsetInfiniteQueryParamsSchema;

export default new Endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureAccess(event);
    return listCurrentEventsFeed(
      event.locals.authData,
      Query.parse(params),
    );
  },
);
