import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  analyticsBackfillInputSchema,
  analyticsBackfillResponseSchema,
} from '@openpeepshq/common/types';
import { enqueueAnalyticsBackfill } from '@openpeepshq/core/analytics';

export const Input = analyticsBackfillInputSchema;
export const Output = analyticsBackfillResponseSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);
    const result = await enqueueAnalyticsBackfill(input.from, input.to);
    return Output.parse(result);
  },
);
