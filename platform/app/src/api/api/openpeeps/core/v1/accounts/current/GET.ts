import { Endpoint } from 'sveltekit-api';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { publicAccountSchema, type PublicAccount } from '@openpeeps/common/types';
import { ensureAccount } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';

export const Output = publicAccountSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export default new Endpoint({ Output, Error }).handle(
  async (
    _: unknown,
    event: RequestEvent,
  ): Promise<PublicAccount> => publicAccountSchema.parse(ensureAccount(event)) as PublicAccount
);
