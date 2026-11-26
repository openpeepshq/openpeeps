import { isKnownOAuthScope, parseOAuthScope } from '@openpeepshq/common/lib';
import {
  OAUTH_FULL_ACCESS_SCOPE,
  type OAuthAuthorizationInfo,
  type OAuthAuthorizationRequest,
} from '@openpeepshq/common/types';
import { findOAuthClient, type OAuthClientRecord } from './clients';
import { issueOAuthAuthorizationCode } from './codes';
import { isValidCodeChallenge } from './crypto';
import { oauthError, type OAuthErrorCode } from './errors';
import { findOAuthGrant, upsertOAuthGrant } from './grants';
import { redirectUriMatches } from './redirectUris';

const redirectWith = (
  redirectUri: string,
  params: Record<string, string | undefined>,
) => {
  const url = new URL(redirectUri);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
};

const errorRedirect = (
  request: OAuthAuthorizationRequest,
  error: OAuthErrorCode,
  description: string,
) =>
  redirectWith(request.redirect_uri, {
    error,
    error_description: description,
    state: request.state,
  });

/**
 * Client and redirect URI problems throw: the user sees them on the consent
 * page and is never sent to an unverified URI. Everything else is reported to
 * the (now trusted) redirect URI, per RFC 6749 §4.1.2.1.
 */
const validateAuthorizationRequest = async (
  request: OAuthAuthorizationRequest,
): Promise<
  { client: OAuthClientRecord; scopes: string[] } | { redirectUrl: string }
> => {
  const client = await findOAuthClient(request.client_id);
  if (!client) {
    throw oauthError('invalid_client', 'Unknown client');
  }
  if (!redirectUriMatches(client.redirectUris, request.redirect_uri)) {
    throw oauthError(
      'invalid_redirect_uri',
      'The redirect URI is not registered for this client',
    );
  }
  if (request.response_type !== 'code') {
    return {
      redirectUrl: errorRedirect(
        request,
        'unsupported_response_type',
        'Only the authorization code flow is supported',
      ),
    };
  }
  if (
    request.code_challenge_method !== 'S256' ||
    !isValidCodeChallenge(request.code_challenge ?? '')
  ) {
    return {
      redirectUrl: errorRedirect(
        request,
        'invalid_request',
        'PKCE with code_challenge_method S256 is required',
      ),
    };
  }
  const scopes = parseOAuthScope(request.scope ?? 'openid');
  const allowed = (scope: string) =>
    isKnownOAuthScope(scope) &&
    (scope !== OAUTH_FULL_ACCESS_SCOPE || client.firstParty);
  if (scopes.length === 0 || !scopes.every(allowed)) {
    return {
      redirectUrl: errorRedirect(
        request,
        'invalid_scope',
        'Unknown or disallowed scope requested',
      ),
    };
  }
  return { client, scopes };
};

export const describeOAuthAuthorization = async (
  request: OAuthAuthorizationRequest,
  profileId: string,
): Promise<OAuthAuthorizationInfo> => {
  const validated = await validateAuthorizationRequest(request);
  if ('redirectUrl' in validated) {
    return { status: 'redirect', redirectUrl: validated.redirectUrl };
  }
  const { client, scopes } = validated;
  // Consent is asked once even for first-party clients: a private-use
  // redirect scheme cannot prove which app receives the code (RFC 8252 §8.6).
  const grant = await findOAuthGrant(profileId, client.id);
  return {
    status: 'consent',
    client: {
      id: client.id,
      name: client.name,
      firstParty: client.firstParty,
      clientUri: client.clientUri,
      logoUri: client.logoUri,
    },
    scopes,
    autoApprove: !!grant && scopes.every((s) => grant.scopes.includes(s)),
  };
};

export const decideOAuthAuthorization = async ({
  request,
  approve,
  profileId,
  accountId,
  authTime,
}: {
  request: OAuthAuthorizationRequest;
  approve: boolean;
  profileId: string;
  accountId?: string;
  authTime?: number;
}): Promise<string> => {
  const validated = await validateAuthorizationRequest(request);
  if ('redirectUrl' in validated) {
    return validated.redirectUrl;
  }
  if (!approve) {
    return errorRedirect(request, 'access_denied', 'The user denied access');
  }
  const { client, scopes } = validated;
  await upsertOAuthGrant(profileId, client.id, scopes);
  const code = await issueOAuthAuthorizationCode({
    clientId: client.id,
    redirectUri: request.redirect_uri,
    profileId,
    accountId,
    scopes,
    codeChallenge: request.code_challenge!,
    nonce: request.nonce,
    authTime,
  });
  return redirectWith(request.redirect_uri, { code, state: request.state });
};
