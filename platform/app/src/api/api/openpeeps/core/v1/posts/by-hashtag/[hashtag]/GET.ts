import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listPostsByTag } from '@openpeeps/core/posts';
import { ensureAccess } from '$lib/server/auth';
import { forbidden } from '$lib/server/api/errors';

export const Param = z.object({
  hashtag: z.string(),
});
export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureAccess(event);
    return listPostsByTag(event.locals.authData, params.hashtag, Query.parse(params));
  },
);
