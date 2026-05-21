import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { refreshAuthTokenHandler } from '$lib/server/api/handlers/auth/refresh';
import { authNeeded, forbidden } from '$lib/server/api/errors';

export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => refreshAuthTokenHandler(event),
);
