import { endpoint } from '#lib/endpoint';
import { publicProfileSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import type { RequestEvent } from '@riddl/core';
import { listProfiles } from '@openpeepshq/core/profiles';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicProfileSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) =>
    ensureProfileOrPublicCommunity(event).then(() => listProfiles())
);
