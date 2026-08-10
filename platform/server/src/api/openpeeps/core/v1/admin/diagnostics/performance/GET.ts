import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { adminPerformanceStatsSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  dbTimingEnabled,
  getSlowRequests,
  slowRequestMs,
} from '@openpeepshq/core/performance';

export const Output = adminPerformanceStatsSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    return {
      slowRequestMs: slowRequestMs(),
      dbTimingEnabled: dbTimingEnabled(),
      slowRequests: getSlowRequests(),
    };
  },
);
