import { Endpoint } from 'sveltekit-api';
import { publicProfileSchema } from '@openpeeps/common/types';
import { forbidden } from '$lib/server/api/errors';
import type { RequestEvent } from '@sveltejs/kit';
import { listProfiles } from '@openpeeps/core/profiles';
import { ensureProfileOrPublicCommunity } from '$lib/server/auth';

export const Output = publicProfileSchema.array();

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) =>
    ensureProfileOrPublicCommunity(event).then(() => listProfiles())
);
