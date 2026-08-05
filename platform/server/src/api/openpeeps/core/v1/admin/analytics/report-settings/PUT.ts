import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { analyticsReportSettingsSchema } from '@openpeeps/common/types';
import { setAnalyticsReportSettings } from '@openpeeps/core/analytics';

export const Input = analyticsReportSettingsSchema;
export const Output = analyticsReportSettingsSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);
    return setAnalyticsReportSettings(input);
  },
);
