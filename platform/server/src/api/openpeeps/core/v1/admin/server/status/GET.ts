import { endpoint } from '#lib/endpoint';
import { adminServerStatusSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { adminServerStatus } from '@openpeepshq/core/server';

export const Output = adminServerStatusSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);

    return adminServerStatus();
  },
);
