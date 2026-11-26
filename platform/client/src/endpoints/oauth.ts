import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
  OAuthAuthorizationDecision,
  OAuthAuthorizationInfo,
  OAuthGrant,
  OAuthRedirect,
  SuccessResponse,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const oauth = (rawClient: FetchClient) => ({
  authorizationInfo: allpeepNoPayloadEndpoint<
    OAuthAuthorizationInfo,
    undefined,
    Record<string, string>
  >(rawClient, '/oauth/authorize'),
  authorize: allpeepPayloadEndpoint<OAuthRedirect, OAuthAuthorizationDecision>(
    rawClient,
    '/oauth/authorize',
  ),
  grants: allpeepNoPayloadEndpoint<OAuthGrant[]>(rawClient, '/oauth/grants'),
  revokeGrant: allpeepNoPayloadEndpoint<SuccessResponse, { clientId: string }>(
    rawClient,
    '/oauth/grants/:clientId',
    'delete',
  ),
});
