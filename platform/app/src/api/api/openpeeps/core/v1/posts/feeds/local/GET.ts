import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listLocalFeed } from '@openpeeps/core/posts';
import { ensureAccess } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export default new Endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureAccess(event);
    return listLocalFeed(event.locals.authData, Query.parse(params));
  },
);
