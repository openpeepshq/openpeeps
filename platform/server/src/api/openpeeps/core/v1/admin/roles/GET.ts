import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listRoles } from '@openpeepshq/core/roles';
import { roleSchema } from '@openpeepshq/common/types';

export const Output = roleSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-roles-read']);

    const roles = await listRoles();

    return Output.parse(roles);
  },
);
