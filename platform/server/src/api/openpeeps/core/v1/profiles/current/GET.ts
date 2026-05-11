import { endpoint, z } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { profileWithMetaSchema } from '@openpeeps/common/types';

export const Output = profileWithMetaSchema || z.object({});

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(async (_, event) => {
  const profile = event.context.currentProfile;
  if (!profile) {
    throw forbidden();
  }
  return profile;
});
