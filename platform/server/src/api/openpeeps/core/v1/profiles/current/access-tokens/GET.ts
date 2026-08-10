import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  publicAccessTokenSchema,
} from '@openpeepshq/common/types';
import { listAccessTokensForProfile } from '@openpeepshq/core/accessTokens';
import { forbidden } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';

export const Output = z.array(publicAccessTokenSchema);

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_params, event: RequestEvent) =>
    ensureLocalProfile(event).then(listAccessTokensForProfile));
