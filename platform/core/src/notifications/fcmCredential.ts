import { createSign } from 'node:crypto';
import https from 'node:https';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_HOST = 'oauth2.googleapis.com';
const TOKEN_PATH = '/token';

type FcmServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
};

const signJwt = (serviceAccount: FcmServiceAccount) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: FCM_SCOPE,
      aud: `https://${TOKEN_HOST}${TOKEN_PATH}`,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const signInput = `${header}.${claim}`;
  const signature = createSign('RSA-SHA256')
    .update(signInput)
    .sign(serviceAccount.private_key, 'base64url');

  return `${signInput}.${signature}`;
};

const fetchAccessToken = (
  serviceAccount: FcmServiceAccount,
  agent: https.Agent,
): Promise<AccessTokenResponse> =>
  new Promise((resolve, reject) => {
    const body = `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${signJwt(serviceAccount)}`;

    const req = https.request(
      {
        hostname: TOKEN_HOST,
        path: TOKEN_PATH,
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `FCM OAuth token request failed (${res.statusCode}): ${data}`,
              ),
            );
            return;
          }
          resolve(JSON.parse(data) as AccessTokenResponse);
        });
      },
    );
    req.on('error', reject);
    req.end(body);
  });

export const createFcmCredential = (
  serviceAccount: FcmServiceAccount,
  agent: https.Agent,
) => {
  let cached: { access_token: string; expiresAt: number } | undefined;

  return {
    getAccessToken: async () => {
      const now = Date.now();
      if (cached && cached.expiresAt > now + 60_000) {
        return {
          access_token: cached.access_token,
          expires_in: Math.floor((cached.expiresAt - now) / 1000),
        };
      }

      const token = await fetchAccessToken(serviceAccount, agent);
      cached = {
        access_token: token.access_token,
        expiresAt: now + token.expires_in * 1000,
      };
      return token;
    },
  };
};
