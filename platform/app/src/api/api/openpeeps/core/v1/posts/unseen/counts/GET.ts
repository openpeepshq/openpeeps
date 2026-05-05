import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureLocalProfile } from '$lib/server/auth';
import { getUnseenPostCounts } from '@openpeeps/core/posts';
import { unseenPostCountsSchema } from '@openpeeps/common/types';

export const Output = unseenPostCountsSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    return getUnseenPostCounts(profile);
  },
);
