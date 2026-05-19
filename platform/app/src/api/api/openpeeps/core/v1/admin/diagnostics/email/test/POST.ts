import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
  adminEmailQueueTestInputSchema,
  successResponseSchema,
} from '@openpeeps/common/types';
import { badRequest, forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { queueTestEmail } from '@openpeeps/core/email';

export const Input = adminEmailQueueTestInputSchema;

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-update']);

    await queueTestEmail(input.to);

    return Output.parse({ success: true });
  },
);
