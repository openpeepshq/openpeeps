import { Endpoint } from 'sveltekit-api';
import { adminServerStatsSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { serverStats } from '@openpeeps/core/stats';

export const Output = adminServerStatsSchema;
export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);

    return serverStats();
  },
);
