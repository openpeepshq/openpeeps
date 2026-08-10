import { endpoint } from '#lib/endpoint';
import { adminServerStatsSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { serverStats } from '@openpeepshq/core/stats';

// Legacy live OLTP aggregates for the admin Dashboard.
// Prefer /admin/analytics/* (rollup + Redis) for the analytics UI.
export const Output = adminServerStatsSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);

    return serverStats();
  },
);
