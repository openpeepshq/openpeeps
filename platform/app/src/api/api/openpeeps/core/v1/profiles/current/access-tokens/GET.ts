import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
  publicAccessTokenSchema,
} from '@openpeeps/common/types';
import { listAccessTokensForProfile } from '@openpeeps/core/accessTokens';
import { forbidden } from '$lib/server/api/errors';
import { ensureLocalProfile } from '$lib/server/auth';

export const Output = z.array(publicAccessTokenSchema);

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_params, event: RequestEvent) =>
    ensureLocalProfile(event).then(listAccessTokensForProfile));
