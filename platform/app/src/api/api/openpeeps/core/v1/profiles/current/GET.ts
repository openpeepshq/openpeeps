import { Endpoint, z } from 'sveltekit-api';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { profileWithMetaSchema } from '@openpeeps/common/types';

export const Output = profileWithMetaSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export default new Endpoint({ Output, Error }).handle(async (_, event) => {
  const profile = event.locals.currentProfile;
  if (!profile) {
    throw forbidden();
  }
  return profile;
});
