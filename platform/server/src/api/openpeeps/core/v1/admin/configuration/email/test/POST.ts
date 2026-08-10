import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  adminEmailTestInputSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { badRequest, forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { sendSmtpTestEmail } from '@openpeepshq/core/email';

export const Input = adminEmailTestInputSchema;

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
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
