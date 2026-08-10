import { createHash, randomBytes } from 'node:crypto';

import { clampProfileDisplayName } from '@openpeepshq/common/lib';
import { z } from '#lib/endpoint';
import {
  findNewFreeHandle,
  createProfile,
  listProfilesByAccount,
} from '@openpeepshq/core/profiles';
import { createAccount, findAccountByEmail } from '@openpeepshq/core/accounts';
import type {
  CoreConfig,
  ProfileData,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { config } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';
import { serverRootUrl } from '@openpeepshq/core/server';
import { createSignedProfileAccessToken } from '@openpeepshq/core/accessTokens';
import { getSharedConnection } from '@openpeepshq/core/redis';
import { uuidv4 } from 'uuidv7';

const log = logger('server:sso:oidc');

interface PkceState {
  codeVerifier: string;
  returnTo?: string;
}

export interface OidcCallbackResult {
  success: boolean;
  token: string;
  error?: string;
  redirectState?: string;
  redirectUrl?: string;
}

const PKCE_STATES_KEY = 'sso:oidc:states';
const PKCE_STATE_TTL = 300;

const base64urlEncode = (buffer: Buffer): string =>
  buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

const extractProfileDataFromOidc = async (
  claims: Record<string, unknown>,
  oidcConfig: CoreConfig['sso']['oidc'][number],
  email: string,
): Promise<ProfileData> => {
  const handleKey = oidcConfig.claimMapping?.handle || 'preferred_username';
  let handleSeed = (claims[handleKey] as string) || email.split('@')[0];

  if (handleSeed.includes('${')) {
    handleSeed = email.split('@')[0];
  }

  const handle = await findNewFreeHandle(handleSeed);

  const avatar = oidcConfig.claimMapping?.avatar
    ? (claims[oidcConfig.claimMapping.avatar] as string | undefined)
    : undefined;

  const displayNameKey = oidcConfig.claimMapping?.displayName || 'name';
  let displayName = claims[displayNameKey] as string | undefined;
  if (displayName?.includes('${')) {
    displayName = undefined;
  }

  return {
    handle,
    avatar,
    displayName: clampProfileDisplayName(displayName),
    type: 'local',
  };
};

const extractEmail = (
  claims: Record<string, unknown>,
  oidcConfig: CoreConfig['sso']['oidc'][number],
): string | undefined => {
  const key = oidcConfig.claimMapping?.email || 'email';
  return claims[key] as string | undefined;
};

const fetchToken = async (
  oidcConfig: CoreConfig['sso']['oidc'][number],
  authorizationCode: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<Record<string, unknown>> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: oidcConfig.clientId,
    code_verifier: codeVerifier,
  });

  if (oidcConfig.clientSecret) {
    body.set('client_secret', oidcConfig.clientSecret);
  }

  const tokenResponse = await fetch(oidcConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    log.error(
      { status: tokenResponse.status, body: errorBody },
      'OIDC token exchange failed',
    );
    throw new Error(
      `OIDC token exchange failed: ${tokenResponse.status} ${errorBody}`,
    );
  }

  return (await tokenResponse.json()) as Record<string, unknown>;
};

const verifyAndDecodeToken = async (
  oidcConfig: CoreConfig['sso']['oidc'][number],
  idToken: string,
): Promise<Record<string, unknown>> => {
  if (!oidcConfig.jwksUri) {
    const { decodeJwt } = await import('jose');
    return decodeJwt(idToken) as Record<string, unknown>;
  }

  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const jwks = createRemoteJWKSet(new URL(oidcConfig.jwksUri));
  const { payload } = await jwtVerify(idToken, jwks);
  return payload as Record<string, unknown>;
};

const fetchUserinfo = async (
  oidcConfig: CoreConfig['sso']['oidc'][number],
  accessToken: string,
): Promise<Record<string, unknown>> => {
  const response = await fetch(oidcConfig.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    log.warn('Userinfo endpoint failed, using token claims only');
    return {};
  }

  return (await response.json()) as Record<string, unknown>;
};

const getRedirectUri = async (providerId: string): Promise<string> => {
  const origin = await serverRootUrl();
  return `${origin}/api/openpeeps/core/v1/sso/oidc/${providerId}/callback`;
};

// ============================================================
// GET /sso/oidc/:id/authorize -- Initiate OIDC flow
// ============================================================
export const authorize = async (
  providerId: string,
  params: Record<string, string>,
): Promise<URL> => {
  const appConfig = await config();
  const provider = appConfig.sso.oidc.find((p) => p.id === providerId);

  if (!provider) {
    const available =
      appConfig.sso.oidc.map((p) => p.id).join(', ') || '(none configured)';
    throw new Error(
      `OIDC provider "${providerId}" not found. Available: ${available}`,
    );
  }

  const codeVerifier = base64urlEncode(randomBytes(32));
  const codeChallenge = base64urlEncode(
    createHash('sha256').update(codeVerifier).digest(),
  );

  // Use an opaque random state ID so that OIDC providers (e.g. WordPress)
  // cannot mangle it. Store codeVerifier + returnTo in Redis keyed by this ID.
  const stateId = base64urlEncode(randomBytes(16));
  const returnTo = params['returnTo'] || '/feeds/local';
  const redirectUri = await getRedirectUri(provider.id);

  const paramsToAuth = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope: provider.scope || 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: stateId,
  });

  await (
    await getSharedConnection()
  ).setEx(
    `${PKCE_STATES_KEY}:${stateId}`,
    PKCE_STATE_TTL,
    JSON.stringify({ codeVerifier, returnTo }),
  );

  const authUrl = new URL(provider.authorizationUrl);
  paramsToAuth.forEach((value, key) => authUrl.searchParams.set(key, value));

  return authUrl;
};

// ============================================================
// GET /sso/oidc/:id/callback -- Handle OIDC callback
// ============================================================
export const callback = async (
  providerId: string,
  queryParams: Record<string, string>,
): Promise<OidcCallbackResult> => {
  const { code, state } = queryParams;
  log.debug({ code, state: state?.substring(0, 50) }, 'OIDC callback params');

  if (queryParams.error) {
    const desc = queryParams.error_description || '';
    throw new Error(
      `OIDC authorization error: ${queryParams.error}${desc ? `: ${desc}` : ''}`,
    );
  }

  if (!code || !state) {
    throw new Error(
      `Missing authorization code or state parameter. code=${!!code}, state=${!!state}`,
    );
  }

  const appConfig = await config();
  const provider = appConfig.sso.oidc.find((p) => p.id === providerId);

  if (!provider) {
    throw new Error(`OIDC provider "${providerId}" not found`);
  }

  // Look up PKCE state from Redis using the opaque state ID
  const conn = await getSharedConnection();
  const stateId = decodeURIComponent(state);
  const stateKey = `${PKCE_STATES_KEY}:${stateId}`;
  const storedData = await conn.get(stateKey);

  if (!storedData) {
    log.error(
      { stateId: stateId.substring(0, 40) },
      'PKCE state not found in Redis (expired or already used)',
    );
    throw new Error('PKCE code verifier mismatch or state already used');
  }

  // Delete immediately to prevent replay
  await conn.del(stateKey);

  let pkceState: PkceState;
  try {
    pkceState = JSON.parse(storedData) as PkceState;
  } catch {
    throw new Error('Corrupted PKCE state in Redis');
  }

  if (!pkceState.codeVerifier) {
    throw new Error('PKCE state missing code verifier');
  }

  const tokenData = await fetchToken(
    provider,
    code,
    await getRedirectUri(provider.id),
    pkceState.codeVerifier,
  );

  const idToken = tokenData.id_token as string | undefined;
  if (!idToken) {
    throw new Error('No id_token received from OIDC provider');
  }

  let claims: Record<string, unknown>;
  try {
    claims = await verifyAndDecodeToken(provider, idToken);
  } catch (err) {
    log.error({ error: err }, 'JWT verification failed, using raw token claims');
    const { decodeJwt } = await import('jose');
    claims = decodeJwt(idToken) as Record<string, unknown>;
  }

  const accessToken = tokenData.access_token as string | undefined;
  if (!claims || Object.keys(claims).length === 0) {
    claims = accessToken ? await fetchUserinfo(provider, accessToken) : {};
  }

  log.info(
    {
      claims: JSON.stringify(claims),
      accessToken: accessToken?.substring(0, 20),
    },
    'OIDC resolved claims',
  );

  // If claims lack email, try userinfo endpoint as fallback
  if (!claims.email && accessToken && provider.userinfoUrl) {
    const userinfoData = await fetchUserinfo(provider, accessToken);
    log.info({ userinfo: JSON.stringify(userinfoData) }, 'OIDC userinfo fallback');
    claims = { ...claims, ...userinfoData };
  }

  let email = extractEmail(claims, provider);

  // Fallback: construct email from username/sub + issuer domain if no email claim
  if (!email || !z.string().email().safeParse(email).success) {
    const username = (claims.preferred_username ||
      claims.username ||
      claims.nickname ||
      claims.sub) as string | undefined;
    const issuer = claims.iss as string | undefined;
    if (username && issuer) {
      try {
        const issuerDomain = new URL(issuer).hostname;
        email = `${username}@${issuerDomain}`;
        log.info(
          { email },
          'OIDC: constructed fallback email from username + issuer domain',
        );
      } catch {
        // issuer not a valid URL
      }
    }
    if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
      throw new Error('Could not extract valid email from OIDC claims');
    }
  }

  const normalizedEmail = email.toLowerCase();
  const existingAccount = await findAccountByEmail(normalizedEmail);

  if (existingAccount) {
    let profile: ProfileWithMeta | undefined = (
      await listProfilesByAccount(existingAccount)
    )[0];

    if (!profile) {
      profile = await createProfile(
        await extractProfileDataFromOidc(claims, provider, normalizedEmail),
        existingAccount,
      );
    }

    const token = await createSignedProfileAccessToken({
      account: existingAccount,
      profile,
      name: 'sso:oidc',
      expirationTime: '1w',
    }).then((at) => at.signedToken);

    if (!token) {
      throw new Error('Failed to create SSO access token');
    }

    return { success: true, token };
  }

  const approvalRequired = provider.approvalRequired ?? false;

  if (approvalRequired) {
    const redirectState = Buffer.from(
      JSON.stringify({ ...pkceState, pendingEmail: normalizedEmail }),
    ).toString('base64');
    return {
      success: false,
      token: '',
      error: `Account pending review. A new account for ${normalizedEmail} requires administrator approval.`,
      redirectState,
      redirectUrl: `${await serverRootUrl()}/auth/sso/oidc/pending?provider=${providerId}&state=${redirectState}`,
    };
  }

  const { account, profile } = await createAccount({
    email: normalizedEmail,
    password: uuidv4(),
    emailValidated: true,
    profile: await extractProfileDataFromOidc(claims, provider, normalizedEmail),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const token = await createSignedProfileAccessToken({
    account,
    profile,
    name: 'sso:oidc',
    expirationTime: '1w',
  }).then((at) => at.signedToken);

  if (!token) {
    throw new Error('Failed to create access token for new account');
  }

  return { success: true, token };
};
