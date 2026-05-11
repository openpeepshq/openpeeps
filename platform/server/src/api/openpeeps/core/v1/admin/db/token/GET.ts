import { endpoint } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import { createDbToken } from '@openpeeps/core/auth';

export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(async (_, event) => {
  const profile = await ensureRoleCapabilities(event, ['core-db-access']);

  const token = await createDbToken(profile);

  return { success: true, token };
});
