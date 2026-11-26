import {
  oauthScopesToApiScopes,
  parseOAuthScope,
} from '@openpeepshq/common/lib';
import {
  authorizationSchema,
  type OAuthTokenResponse,
} from '@openpeepshq/common/types';
import { findAccount } from '../accounts/finders';
import { revokeAccessToken } from '../accessTokens/mutations';
import {
  createSignedAccessToken,
  verifySignedAccessToken,
} from '../accessTokens/tokens';
import { jwtUtil } from '../jwt';
import { findProfile } from '../profiles/finders';
import { oidcClaims } from './claims';
import type { OAuthClientRecord } from './clients';
import { redeemOAuthAuthorizationCode } from './codes';
import { verifyPkceS256 } from './crypto';
import { oauthError } from './errors';
import { findOAuthGrant } from './grants';
import {
  consumeOAuthRefreshToken,
  findOAuthRefreshToken,
  issueOAuthRefreshToken,
  revokeOAuthRefreshTokenFamily,
} from './refreshTokens';
import { signIdToken } from './signing';

const ACCESS_TOKEN_TTL_SEC = 60 * 60;

const loadSubject = async (profileId: string, accountId?: string) => {
  const profile = await findProfile(profileId);
  const account = accountId ? await findAccount(accountId) : undefined;
  if (!profile || profile.deletedAt || (accountId && account?.deletedAt)) {
    throw oauthError('invalid_grant', 'The user no longer exists');
  }
  return { profile, account: account ?? undefined };
};

const issueTokens = async ({
  issuer,
  client,
  profileId,
  accountId,
  scopes,
  nonce,
  authTime,
  familyId,
}: {
  issuer: string;
  client: OAuthClientRecord;
  profileId: string;
  accountId?: string;
  scopes: string[];
  nonce?: string;
  authTime?: number;
  familyId?: string;
}): Promise<OAuthTokenResponse> => {
  const { profile, account } = await loadSubject(profileId, accountId);
  const accessToken = await createSignedAccessToken({
    profile,
    name: `oauth:${client.name}`,
    description: client.id,
    authorization: {
      identities: {
        profile: profile.id,
        account: account?.id,
        client: client.id,
      },
      scopes: oauthScopesToApiScopes(scopes, profile.id),
    },
    expirationTime: `${ACCESS_TOKEN_TTL_SEC}s`,
  });
  const refreshToken = scopes.includes('offline_access')
    ? await issueOAuthRefreshToken({
        clientId: client.id,
        profileId: profile.id,
        accountId: account?.id,
        scopes,
        accessTokenId: accessToken.id,
        authTime: authTime ? new Date(authTime * 1000).toISOString() : null,
        familyId,
      })
    : undefined;
  const idToken = scopes.includes('openid')
    ? await signIdToken({
        issuer,
        clientId: client.id,
        claims: oidcClaims({ profile, account, scopes }) as Record<
          string,
          string | boolean
        > & { sub: string },
        nonce,
        authTime,
      })
    : undefined;
  return {
    access_token: accessToken.signedToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SEC,
    scope: scopes.join(' '),
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
    ...(idToken ? { id_token: idToken } : {}),
  };
};

export const exchangeOAuthAuthorizationCode = async ({
  issuer,
  client,
  code,
  redirectUri,
  codeVerifier,
}: {
  issuer: string;
  client: OAuthClientRecord;
  code?: string;
  redirectUri?: string;
  codeVerifier?: string;
}): Promise<OAuthTokenResponse> => {
  const data = code ? await redeemOAuthAuthorizationCode(code) : undefined;
  if (
    !data ||
    data.clientId !== client.id ||
    data.redirectUri !== redirectUri
  ) {
    throw oauthError('invalid_grant', 'Authorization code is invalid');
  }
  if (!verifyPkceS256(codeVerifier ?? '', data.codeChallenge)) {
    throw oauthError('invalid_grant', 'PKCE verification failed');
  }
  return issueTokens({ issuer, client, ...data });
};

export const exchangeOAuthRefreshToken = async ({
  issuer,
  client,
  refreshToken,
  scope,
}: {
  issuer: string;
  client: OAuthClientRecord;
  refreshToken?: string;
  scope?: string;
}): Promise<OAuthTokenResponse> => {
  if (!refreshToken) {
    throw oauthError('invalid_request', 'refresh_token is required');
  }
  const row = await consumeOAuthRefreshToken(refreshToken, client.id);
  const requested = scope ? parseOAuthScope(scope) : row.scopes;
  if (!requested.every((s) => row.scopes.includes(s))) {
    throw oauthError('invalid_scope', 'Scope exceeds the original grant');
  }
  if (!(await findOAuthGrant(row.profileId, client.id))) {
    throw oauthError('invalid_grant', 'Access was revoked');
  }
  return issueTokens({
    issuer,
    client,
    profileId: row.profileId,
    accountId: row.accountId ?? undefined,
    scopes: requested,
    authTime: row.authTime
      ? Math.floor(new Date(row.authTime).getTime() / 1000)
      : undefined,
    familyId: row.familyId,
  });
};

/** RFC 7009: unknown or foreign tokens are ignored, never reported. */
export const revokeOAuthToken = async ({
  client,
  token,
}: {
  client: OAuthClientRecord;
  token: string;
}) => {
  const refresh = await findOAuthRefreshToken(token);
  if (refresh) {
    if (refresh.clientId === client.id) {
      await revokeOAuthRefreshTokenFamily(refresh.familyId);
    }
    return;
  }
  const verified = await (await jwtUtil()).verify(token);
  const parsed = authorizationSchema.safeParse(verified?.payload);
  const jti = verified?.payload.jti;
  if (parsed.success && parsed.data.identities.client === client.id && jti) {
    await revokeAccessToken(jti);
  }
};

/** OIDC Core §5.3: claims for the user behind a delegated access token. */
export const oauthUserinfo = async (token: string) => {
  const authorization = await verifySignedAccessToken(token);
  const {
    profile: profileId,
    account: accountId,
    client,
  } = authorization?.identities ?? {};
  const grant =
    profileId && client ? await findOAuthGrant(profileId, client) : undefined;
  if (!profileId || !client) {
    throw oauthError('invalid_token', 'The access token is invalid');
  }
  if (!grant?.scopes.includes('openid')) {
    // A valid delegated token that was not granted openid cannot answer
    // userinfo (OIDC Core §5.3); report it as a scope gap, not a bad token.
    throw oauthError(
      'insufficient_scope',
      'The access token is missing the openid scope',
    );
  }
  const { profile, account } = await loadSubject(profileId, accountId).catch(
    () => {
      throw oauthError('invalid_token', 'The access token is invalid');
    },
  );
  return oidcClaims({ profile, account, scopes: grant.scopes });
};
