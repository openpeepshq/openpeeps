import { endpoint } from '#lib/endpoint';
import { adminGroupSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listAdminGroups } from '@openpeeps/core/groups';

export const Output = adminGroupSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-groups-read']);

    return await listAdminGroups();
  },
);
