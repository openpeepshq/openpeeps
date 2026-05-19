import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
  adminEmailTestInputSchema,
  successResponseSchema,
} from '@openpeeps/common/types';
import { badRequest, forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { sendSmtpTestEmail } from '@openpeeps/core/email';

export const Input = adminEmailTestInputSchema;

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-update']);

    try {
      await sendSmtpTestEmail(input);
      return Output.parse({ success: true });
    } catch (err) {
      const message =
        err instanceof globalThis.Error ? err.message : String(err);
      throw badRequest(message);
    }
  },
);
