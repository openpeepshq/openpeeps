import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  oauthAuthorizationInfoSchema,
  oauthAuthorizationRequestSchema,
  type OAuthAuthorizationRequest,
} from '@openpeepshq/common/types';
import { describeOAuthAuthorization } from '@openpeepshq/core/oauth';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded, badRequest, rethrowIfOAuthError } from '#lib/errors';

export const Query = oauthAuthorizationRequestSchema;
export const Output = oauthAuthorizationInfoSchema;

export const Error = {
  400: badRequest(),
  401: authNeeded(),
};

// Backs the consent page: validates the client's authorization request and
// says whether the signed-in user still has to approve it.
export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (request: OAuthAuthorizationRequest, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event, false);
    return describeOAuthAuthorization(request, profile.id).catch(
      rethrowIfOAuthError,
    );
  },
);
