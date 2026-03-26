import { Endpoint } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { createDbToken } from '@openpeeps/core/auth';

export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(async (_, event) => {
  const profile = await ensureRoleCapabilities(event, ['core-db-access']);

  const token = await createDbToken(profile);

  return { success: true, token };
});
