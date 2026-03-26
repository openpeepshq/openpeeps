import { Endpoint, z } from 'sveltekit-api';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { geocodingResultSchema } from '@openpeeps/common/types';
import { getLocationSuggestions } from '@openpeeps/core/location';
import { ensureLocalProfile } from '$lib/server/auth';

export const Output = geocodingResultSchema.array();
export const Query = z.object({
  query: z.string(),
});

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export default new Endpoint({ Query, Output, Error }).handle(async (input, request) => {
  await ensureLocalProfile(request);
  return getLocationSuggestions(input.query);
});
