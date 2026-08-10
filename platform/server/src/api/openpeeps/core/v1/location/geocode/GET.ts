import { endpoint, z } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { geocodingResultSchema } from '@openpeepshq/common/types';
import { getLocationSuggestions } from '@openpeepshq/core/location';
import { ensureLocalProfile } from '#lib/auth';

export const Output = geocodingResultSchema.array();
export const Query = z.object({
  query: z.string(),
});

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(async (input, request) => {
  await ensureLocalProfile(request);
  return getLocationSuggestions(input.query);
});
