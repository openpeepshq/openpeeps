import { Endpoint } from 'sveltekit-api';
import { forbidden, internalError } from '$lib/server/api/errors';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { createSignedDbToken } from '@openpeeps/core/accessTokens';

export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  500: internalError(),
};

export default new Endpoint({ Output, Error }).handle(async (_, event) => {
  const profile = await ensureRoleCapabilities(event, ['core-db-access']);

  const token = await createSignedDbToken(profile);

  if (!token.signedToken) {
    throw internalError('accessTokens.createFailed');
  }

  return { success: true, token: token.signedToken };
});
