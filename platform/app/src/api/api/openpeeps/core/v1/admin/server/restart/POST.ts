import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { successResponseSchema } from '@openpeeps/common/types';

export const Error = {
  403: forbidden(),
};

export const Output = successResponseSchema;

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-maintenance-restart']);

    process.exit(99);
  },
);
