import { Endpoint, z } from 'sveltekit-api';
import { postTypeSchema, publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listPostsByType } from '@openpeeps/core/posts';
import { ensureProfileOrPublicCommunity } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Param = z.object({
  type: postTypeSchema,
});
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export default new Endpoint({ Output, Param, Query }).handle(
  async (params, event: RequestEvent) =>
    listPostsByType(await ensureProfileOrPublicCommunity(event), params.type, Query.parse(params))
);
