import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  analyticsDateQuerySchema,
  analyticsRetentionSchema,
} from '@openpeepshq/common/types';
import { getAnalyticsRetention } from '@openpeepshq/core/analytics';

export const Query = analyticsDateQuerySchema;
export const Output = analyticsRetentionSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);
    return getAnalyticsRetention(input);
  },
);
