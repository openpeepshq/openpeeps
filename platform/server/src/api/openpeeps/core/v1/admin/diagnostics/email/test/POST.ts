import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  adminEmailQueueTestInputSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { badRequest, forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { queueTestEmail } from '@openpeepshq/core/email';

export const Input = adminEmailQueueTestInputSchema;

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-update']);

    await queueTestEmail(input.to);

    return Output.parse({ success: true });
  },
);
