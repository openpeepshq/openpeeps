import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { publicPostSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import { listBookmarkedPosts } from '@openpeeps/core/posts';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export default new Endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    return listBookmarkedPosts(profile, profile, Query.parse(params));
  },
);
