import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  analyticsDateQuerySchema,
  analyticsEngagementSchema,
} from '@openpeeps/common/types';
import { getAnalyticsEngagement } from '@openpeeps/core/analytics';

export const Query = analyticsDateQuerySchema;
export const Output = analyticsEngagementSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);
    return getAnalyticsEngagement(input);
  },
);
