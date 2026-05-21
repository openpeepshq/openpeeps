import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { publicPostSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { listPostsByProfile } from '@openpeeps/core/posts';

export const Output = publicPostSchema.array();

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return listPostsByProfile(event.locals.authData, currentProfile, { limit: 1000 })
      .then(posts => posts.filter(p => p.repost && publicPostSchema.safeParse(p).success));
  },
);
