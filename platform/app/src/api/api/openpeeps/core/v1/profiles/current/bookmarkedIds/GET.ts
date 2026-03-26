import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureLocalProfile } from '$lib/server/auth';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { listBookmarkedPostIds } from '@openpeeps/core/posts';

export const Output = z.array(z.string());

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return listBookmarkedPostIds(currentProfile);
  },
);
