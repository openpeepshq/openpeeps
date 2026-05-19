import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { adminEmailQueueStatsSchema } from '@openpeeps/common/types';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { getSendEmailQueueStats } from '@openpeeps/core/email';

export const Output = adminEmailQueueStatsSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    return getSendEmailQueueStats();
  },
);
