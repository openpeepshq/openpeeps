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

const log = logger('server:sso:oauth2');

export type OAuth2Kind = 'github' | 'gitlab';

type OAuth2Provider = CoreConfig['sso']['github'][number];

interface PkceState {
  codeVerifier: string;
  returnTo?: string;
}

export interface OAuth2CallbackResult {
  success: boolean;
  token: string;
  error?: string;
  redirectUrl?: string;
}

const PKCE_STATE_TTL = 300;

const base64urlEncode = (buffer: Buffer): string =>
  buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

/**
 * Endpoint + profile-shape derivation per provider kind. `instanceUrl` empty
 * means the public github.com/gitlab.com service; set for GitHub Enterprise
 * or a self-hosted GitLab (e.g. https://git-lab.de).
 */
const endpointsFor = (kind: OAuth2Kind, instanceUrl?: string) => {
  const base = (
    instanceUrl ||
    (kind === 'github' ? 'https://github.com' : 'https://gitlab.com')
  ).replace(/\/$/, '');
  if (kind === 'github') {
    const apiBase = instanceUrl ? `${base}/api/v3` : 'https://api.github.com';
    return {
      authorizationUrl: `${base}/login/oauth/authorize`,
      tokenUrl: `${base}/login/oauth/access_token`,
      userinfoUrl: `${apiBase}/user`,
      emailsUrl: `${apiBase}/user/emails`,
    };
  }
  return {
    authorizationUrl: `${base}/oauth/authorize`,
    tokenUrl: `${base}/oauth/token`,
    userinfoUrl: `${base}/api/v4/user`,
    emailsUrl: undefined,
  };
};

const extractProfileData = async (
  kind: OAuth2Kind,
  profile: Record<string, unknown>,
  email: string,
): Promise<ProfileData> => {
  const handleSeed =
    (kind === 'github'
      ? (profile.login as string | undefined)
      : (profile.username as string | undefined)) || email.split('@')[0];
  const handle = await findNewFreeHandle(handleSeed);
  const avatar =
    (profile.avatar_url as string | undefined) ||
    (profile.avatarUrl as string | undefined);
  const displayName =
    (profile.name as string | undefined) ||
    (profile.displayName as string | undefined);

  return {
    handle,
    avatar,
    displayName: clampProfileDisplayName(displayName),
    type: 'local',
  };
};

const fetchToken = async (
  kind: OAuth2Kind,
  provider: OAuth2Provider,
  authorizationCode: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<Record<string, unknown>> => {
  const { tokenUrl } = endpointsFor(kind, provider.instanceUrl);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: provider.clientId,
    code_verifier: codeVerifier,
  });
  if (provider.clientSecret) body.set('client_secret', provider.clientSecret);

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    log.error(
      { kind, status: tokenResponse.status, body: errorBody },
      'OAuth2 token exchange failed',
    );
    throw new Error(
      `${kind} token exchange failed: ${tokenResponse.status} ${errorBody}`,
    );
  }

  return (await tokenResponse.json()) as Record<string, unknown>;
};

const fetchProfile = async (
  kind: OAuth2Kind,
  provider: OAuth2Provider,
  accessToken: string,
): Promise<{ profile: Record<string, unknown>; email?: string }> => {
  const { userinfoUrl, emailsUrl } = endpointsFor(kind, provider.instanceUrl);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  const profileResponse = await fetch(userinfoUrl, { headers });
  if (!profileResponse.ok) {
    throw new Error(
      `${kind} profile request failed: ${profileResponse.status}`,
    );
  }
  const profile = (await profileResponse.json()) as Record<string, unknown>;

  let email = profile.email as string | undefined;

  // GitHub only returns a public email in /user if the user opted in; the
  // primary/verified address usually needs the dedicated emails endpoint.
  if (!email && kind === 'github' && emailsUrl) {
    const emailsResponse = await fetch(emailsUrl, { headers });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary?: boolean;
        verified?: boolean;
      }>;
      email = (
        emails.find((e) => e.primary && e.verified) ||
        emails.find((e) => e.verified)
      )?.email;
    }
  }

  return { profile, email };
};

const getRedirectUri = async (
  kind: OAuth2Kind,
  providerId: string,
): Promise<string> => {
  const origin = await serverRootUrl();
  return `${origin}/api/openpeeps/core/v1/sso/${kind}/${providerId}/callback`;
};

const findProvider = async (
  kind: OAuth2Kind,
  providerId: string,
): Promise<OAuth2Provider> => {
  const appConfig = await config();
  const provider = appConfig.sso[kind].find((p) => p.id === providerId);
  if (!provider) {
    const available =
      appConfig.sso[kind].map((p) => p.id).join(', ') || '(none configured)';
    throw new Error(
      `${kind} provider "${providerId}" not found. Available: ${available}`,
    );
  }
  return provider;
};

export const authorize = async (
  kind: OAuth2Kind,
  providerId: string,
  params: Record<string, string>,
): Promise<URL> => {
  const provider = await findProvider(kind, providerId);
  const { authorizationUrl } = endpointsFor(kind, provider.instanceUrl);

  const codeVerifier = base64urlEncode(randomBytes(32));
  const codeChallenge = base64urlEncode(
    createHash('sha256').update(codeVerifier).digest(),
  );
  const stateId = base64urlEncode(randomBytes(16));
  const returnTo = params['returnTo'] || '/feeds/local';
  const redirectUri = await getRedirectUri(kind, provider.id);

  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope:
      provider.scope ||
      (kind === 'github' ? 'read:user user:email' : 'read_user'),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: stateId,
  });

  await (
    await getSharedConnection()
  ).setEx(
    `sso:${kind}:states:${stateId}`,
    PKCE_STATE_TTL,
    JSON.stringify({ codeVerifier, returnTo }),
  );

  const authUrl = new URL(authorizationUrl);
  authParams.forEach((value, key) => authUrl.searchParams.set(key, value));
  return authUrl;
};

export const callback = async (
  kind: OAuth2Kind,
  providerId: string,
  queryParams: Record<string, string>,
): Promise<OAuth2CallbackResult> => {
  const {
    code,
    state,
    error,
    error_description: errorDescription,
  } = queryParams;

  if (error) {
    throw new Error(
      `${kind} authorization error: ${error}${errorDescription ? `: ${errorDescription}` : ''}`,
    );
  }
  if (!code || !state) {
    throw new Error(
      `Missing authorization code or state parameter. code=${!!code}, state=${!!state}`,
    );
  }

  const provider = await findProvider(kind, providerId);

  const conn = await getSharedConnection();
  const stateKey = `sso:${kind}:states:${decodeURIComponent(state)}`;
  const storedData = await conn.get(stateKey);
  if (!storedData) {
    throw new Error('PKCE code verifier mismatch or state already used');
  }
  await conn.del(stateKey);

  const pkceState = JSON.parse(storedData) as PkceState;
  if (!pkceState.codeVerifier) {
    throw new Error('PKCE state missing code verifier');
  }

  const tokenData = await fetchToken(
    kind,
    provider,
    code,
    await getRedirectUri(kind, provider.id),
    pkceState.codeVerifier,
  );

  const accessToken = tokenData.access_token as string | undefined;
  if (!accessToken) {
    throw new Error(`No access_token received from ${kind}`);
  }

  const { profile, email } = await fetchProfile(kind, provider, accessToken);
  if (!email || !z.string().email().safeParse(email).success) {
    throw new Error(`Could not extract a verified email from ${kind} profile`);
  }
  const normalizedEmail = email.toLowerCase();

  const existingAccount = await findAccountByEmail(normalizedEmail);
  if (existingAccount) {
    let profileWithMeta: ProfileWithMeta | undefined = (
      await listProfilesByAccount(existingAccount)
    )[0];
    if (!profileWithMeta) {
      profileWithMeta = await createProfile(
        await extractProfileData(kind, profile, normalizedEmail),
        existingAccount,
      );
    }
    const token = await createSignedProfileAccessToken({
      account: existingAccount,
      profile: profileWithMeta,
      name: `sso:${kind}`,
      expirationTime: '1w',
    }).then((at) => at.signedToken);
    if (!token) throw new Error('Failed to create SSO access token');
    return { success: true, token };
  }

  if (provider.approvalRequired) {
    return {
      success: false,
      token: '',
      error: `Account pending review. A new account for ${normalizedEmail} requires administrator approval.`,
      redirectUrl: `${await serverRootUrl()}/auth/sso/${kind}/pending?provider=${providerId}`,
    };
  }

  const { account, profile: createdProfile } = await createAccount({
    email: normalizedEmail,
    password: uuidv4(),
    emailValidated: true,
    profile: await extractProfileData(kind, profile, normalizedEmail),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const token = await createSignedProfileAccessToken({
    account,
    profile: createdProfile,
    name: `sso:${kind}`,
    expirationTime: '1w',
  }).then((at) => at.signedToken);
  if (!token) throw new Error('Failed to create access token for new account');
  return { success: true, token };
};
