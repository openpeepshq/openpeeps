import { Linking } from 'react-native';
import { sha256 } from '@noble/hashes/sha2';
import {
  buildOAuthAuthorizeUrl,
  OAUTH_FULL_ACCESS_SCOPE,
  parseOAuthRedirect,
  requestOAuthToken,
  type Credentials,
} from '@openpeepshq/common';

// The app is a first-party client: it needs the whole API, not a slice of it.
const APP_SCOPE = `openid profile offline_access ${OAUTH_FULL_ACCESS_SCOPE}`;

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// Hermes ships no Web Crypto; the host app must install a getRandomValues
// polyfill (e.g. react-native-get-random-values). PKCE without a CSPRNG would
// be guessable, so there is deliberately no Math.random fallback.
const randomBase64Url = (size: number) => {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available');
  }
  return base64Url(globalThis.crypto.getRandomValues(new Uint8Array(size)));
};

export const createPkcePair = () => {
  const verifier = randomBase64Url(32);
  const challenge = base64Url(
    sha256(Uint8Array.from(verifier, (c) => c.charCodeAt(0)))
  );
  return { verifier, challenge };
};

const SUPERSEDED = 'oauth-login-superseded';

export const isSupersededLogin = (err: unknown) =>
  (err as Error)?.message === SUPERSEDED;

// A browser closed without finishing never redirects back, so a new attempt
// cancels the previous listener instead of stacking another one.
let cancelPending: (() => void) | undefined;

const waitForRedirect = (redirectUri: string) =>
  new Promise<string>((resolve, reject) => {
    cancelPending?.();
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url.startsWith(redirectUri)) return;
      cancelPending = undefined;
      subscription.remove();
      resolve(url);
    });
    cancelPending = () => {
      subscription.remove();
      reject(new Error(SUPERSEDED));
    };
  });

/**
 * Signs in through the community's web login (authorization code + PKCE,
 * RFC 8252) and resolves with credentials holding a rotating refresh token.
 */
export const loginInBrowser = async ({
  serverUrl,
  clientId,
  redirectUri,
}: {
  serverUrl: string;
  clientId: string;
  redirectUri: string;
}): Promise<Credentials> => {
  const { verifier, challenge } = createPkcePair();
  const state = randomBase64Url(16);
  const redirect = waitForRedirect(redirectUri);
  await Linking.openURL(
    buildOAuthAuthorizeUrl({
      serverUrl,
      clientId,
      redirectUri,
      scope: APP_SCOPE,
      state,
      codeChallenge: challenge,
    })
  );
  const params = parseOAuthRedirect(await redirect);
  if (params.state !== state) throw new Error('OAuth state mismatch');
  if (!params.code) {
    throw new Error(params.error_description ?? params.error ?? 'No code');
  }
  const tokens = await requestOAuthToken(serverUrl, {
    grant_type: 'authorization_code',
    client_id: clientId,
    code: params.code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  return {
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    clientId,
  };
};
