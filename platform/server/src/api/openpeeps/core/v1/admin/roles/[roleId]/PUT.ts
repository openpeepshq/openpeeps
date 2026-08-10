import { endpoint, z } from '#lib/endpoint';
import { roleDataSchema, roleSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { findRole, updateRole } from '@openpeepshq/core/roles';

export const Input = roleDataSchema;

export const Param = z.object({
  roleId: z.string(),
});

export const Output = roleSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-roles-update']);

    const role = findRole(input.roleId);
    if (!role) {
      throw notFound();
    }

    return updateRole(input.roleId, roleDataSchema.parse(input));
  },
);
