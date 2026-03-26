import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { publicPostSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { listMyFeed } from '@openpeeps/core/posts';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export default new Endpoint({ Output, Error, Query }).handle(
  async (params, event: RequestEvent) => listMyFeed(await ensureLocalProfile(event), Query.parse(params))
);
