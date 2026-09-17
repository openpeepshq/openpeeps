import { endpoint } from '#lib/endpoint';
import { publicProfileSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { authNeeded, forbidden } from '#lib/errors';
import { listBlockedProfilesHandler } from '#lib/handlers/profile/block';

export const Output = publicProfileSchema.array();

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_: unknown, event: RequestEvent) =>
    listBlockedProfilesHandler(_, event),
);
