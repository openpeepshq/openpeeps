import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { listRoles } from '@openpeeps/core/roles';
import { roleSchema } from '@openpeeps/common/types';

export const Output = roleSchema.array();

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-roles-read']);

    const roles = await listRoles();

    return Output.parse(roles);
  },
);
