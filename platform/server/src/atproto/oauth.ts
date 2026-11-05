import { createHash } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { checkPassword, findByProfile } from '@openpeepshq/core/accounts';
import { findProfile } from '@openpeepshq/core/profiles';
import { getSharedConnection } from '@openpeepshq/core/redis';
import {
  ATPROTO_ACCESS_SCOPE,
  atprotoPublicJwk,
  createAtprotoTokens,
  loadLocalAtprotoIdentity,
  randomOauthCode,
  verifyAtprotoRefresh,
} from '@openpeepshq/core/atproto';
import { invalidRequest } from './errors';
import { requireDpopOnToken } from './auth';

const CODE_TTL_SEC = 300;

type AuthCode = {
  profileId: string;
  did: string;
  redirectUri: string;
  codeChallenge?: string;
};

const codeKey = (code: string) => `atproto:oauth:code:${code}`;

const storeCode = async (code: string, value: AuthCode) => {
  const redis = await getSharedConnection();
  await redis.set(codeKey(code), JSON.stringify(value), { EX: CODE_TTL_SEC });
};

const takeCode = async (code: string): Promise<AuthCode | null> => {
  const redis = await getSharedConnection();
  const raw = await redis.get(codeKey(code));
  if (!raw) return null;
  await redis.del(codeKey(code));
  return JSON.parse(raw) as AuthCode;
};

const verifyChallenge = (verifier: string | undefined, challenge?: string) => {
  if (!challenge) return true;
  if (!verifier) return false;
  const digest = createHash('sha256').update(verifier).digest();
  return Buffer.from(digest).toString('base64url') === challenge;
};

const loginForm = (query: string, error?: string) => `<!doctype html>
<html><body>
<h1>Login</h1>
${error ? `<p>${error}</p>` : ''}
<form method="post" action="/oauth/authorize${query}">
<label>Handle <input name="identifier" required /></label>
<label>Password <input name="password" type="password" required /></label>
<button type="submit">Sign In</button>
</form>
</body></html>`;

const authenticateIdentifier = async (identifier: string, password: string) => {
  const identity = await loadLocalAtprotoIdentity(identifier);
  if (!identity) return null;
  const profile = await findProfile(identity.id);
  if (!profile) return null;
  const accounts = await findByProfile(profile);
  const account = accounts[0];
  if (!account) return null;
  if (!(await checkPassword(account, password))) return null;
  return identity;
};

export const mountOauth = (app: Express) => {
  app.get('/oauth/authorize', (req, res) => {
    res.type('html').send(loginForm(queryString(req)));
  });

  app.post('/oauth/authorize', async (req, res) => {
    const identifier = String(req.body?.identifier ?? '');
    const password = String(req.body?.password ?? '');
    const redirectUri = String(req.query.redirect_uri ?? '');
    const state = req.query.state ? String(req.query.state) : undefined;
    const challenge = req.query.code_challenge
      ? String(req.query.code_challenge)
      : undefined;
    if (!redirectUri) {
      invalidRequest(res, 'redirect_uri required');
      return;
    }
    const identity = await authenticateIdentifier(identifier, password);
    if (!identity) {
      res
        .status(401)
        .type('html')
        .send(loginForm(queryString(req), 'Invalid credentials'));
      return;
    }
    const code = randomOauthCode();
    await storeCode(code, {
      profileId: identity.id,
      did: identity.did,
      redirectUri,
      codeChallenge: challenge,
    });
    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', state);
    res.redirect(url.toString());
  });

  app.post('/oauth/token', async (req, res) => {
    const grant = String(req.body?.grant_type ?? '');
    const jkt = await requireDpopOnToken(req, res);
    if (!jkt) return;
    if (grant === 'refresh_token') {
      const claims = await verifyAtprotoRefresh(
        String(req.body?.refresh_token ?? ''),
      );
      if (!claims) {
        invalidRequest(res, 'Invalid refresh token');
        return;
      }
      writeTokenResponse(res, await createAtprotoTokens({ ...claims, jkt }));
      return;
    }
    if (grant !== 'authorization_code') {
      invalidRequest(res, 'Unsupported grant_type');
      return;
    }
    const stored = await takeCode(String(req.body?.code ?? ''));
    if (!stored) {
      invalidRequest(res, 'Invalid code');
      return;
    }
    if (stored.redirectUri !== String(req.body?.redirect_uri ?? '')) {
      invalidRequest(res, 'redirect_uri mismatch');
      return;
    }
    if (!verifyChallenge(req.body?.code_verifier, stored.codeChallenge)) {
      invalidRequest(res, 'PKCE failed');
      return;
    }
    writeTokenResponse(
      res,
      await createAtprotoTokens({
        did: stored.did,
        profileId: stored.profileId,
        scope: ATPROTO_ACCESS_SCOPE,
        jkt,
      }),
    );
  });

  app.get('/oauth/jwks', async (_req, res) => {
    res.json({ keys: [await atprotoPublicJwk()] });
  });
};

const queryString = (req: Request) => {
  const url = req.originalUrl;
  const idx = url.indexOf('?');
  return idx >= 0 ? url.slice(idx) : '';
};

const writeTokenResponse = (
  res: Response,
  tokens: { accessJwt: string; refreshJwt: string },
) => {
  res.json({
    access_token: tokens.accessJwt,
    refresh_token: tokens.refreshJwt,
    token_type: 'DPoP',
    expires_in: 7200,
    scope: 'atproto',
  });
};
