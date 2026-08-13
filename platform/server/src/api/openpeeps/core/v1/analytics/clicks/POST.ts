import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { authNeeded, forbidden } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import {
  analyticsClicksIngestSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { recordClickEvents } from '@openpeepshq/core/analytics';

export const Input = analyticsClicksIngestSchema;
export const Output = successResponseSchema;
export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureLocalProfile(event);
    await recordClickEvents(input.events);
    return { success: true };
  },
);
