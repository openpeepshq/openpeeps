import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { adminEmailQueueStatsSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { getSendEmailQueueStats } from '@openpeepshq/core/email';

export const Output = adminEmailQueueStatsSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    return getSendEmailQueueStats();
  },
);
