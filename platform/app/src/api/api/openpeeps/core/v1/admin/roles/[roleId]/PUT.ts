import { Endpoint, z } from 'sveltekit-api';
import { roleDataSchema, roleSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { findRole, updateRole } from '@openpeeps/core/roles';

export const Input = roleDataSchema;

export const Param = z.object({
  roleId: z.string(),
});

export const Output = roleSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Param, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-roles-update']);

    const role = findRole(input.roleId);
    if (!role) {
      throw notFound();
    }

    return updateRole(input.roleId, roleDataSchema.parse(input));
  },
);
