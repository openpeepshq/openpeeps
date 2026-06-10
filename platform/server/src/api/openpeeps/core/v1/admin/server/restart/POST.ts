import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { successResponseSchema } from '@openpeeps/common/types';

export const Error = {
  403: forbidden(),
};

export const Output = successResponseSchema;

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-maintenance-restart']);

    process.exit(99);
  },
);
