import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { analyticsReportSettingsSchema } from '@openpeepshq/common/types';
import { getAnalyticsReportSettings } from '@openpeepshq/core/analytics';

export const Output = analyticsReportSettingsSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);
    return getAnalyticsReportSettings();
  },
);
