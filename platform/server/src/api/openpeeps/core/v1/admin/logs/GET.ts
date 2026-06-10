import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listLogs } from '@openpeeps/core/log';

export const Output = z
  .object({
    level: z.string(),
    message: z.string(),
    timestamp: z.string(),
    meta: z.any().optional(),
    namespace: z.string(),
  })
  .array();
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-logs-read']);
    return listLogs();
  },
);
