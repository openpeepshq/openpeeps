import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  oauthAuthorizationDecisionSchema,
  oauthRedirectSchema,
  type OAuthAuthorizationDecision,
} from '@openpeepshq/common/types';
import { decideOAuthAuthorization } from '@openpeepshq/core/oauth';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded, badRequest, rethrowIfOAuthError } from '#lib/errors';

export const Input = oauthAuthorizationDecisionSchema;
export const Output = oauthRedirectSchema;

export const Error = {
  400: badRequest(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (
    { approve, ...request }: OAuthAuthorizationDecision,
    event: RequestEvent,
  ) => {
    const profile = await ensureLocalProfile(event, false);
    // The session token's issue time is when the user last authenticated.
    const { iat } = (event.context.authorization ?? {}) as { iat?: number };
    const redirectUrl = await decideOAuthAuthorization({
      request,
      approve,
      profileId: profile.id,
      accountId: event.context.currentAccount?.id,
      authTime: iat,
    }).catch(rethrowIfOAuthError);
    return { redirectUrl };
  },
);
