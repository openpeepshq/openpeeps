import express, {
  type Express,
  type Request,
  type RequestHandler,
} from 'express';
import { OAUTH_API_PATH } from '@openpeepshq/common/lib';
import { config } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';
import {
  authenticateOAuthClient,
  exchangeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken,
  isOAuthError,
  oauthDiscoveryDocument,
  oauthError,
  oauthJwks,
  oauthUserinfo,
  registerOAuthClient,
  revokeOAuthToken,
  type OAuthErrorCode,
} from '@openpeepshq/core/oauth';
import { getSharedConnection } from '@openpeepshq/core/redis';
import { serverRootUrl } from '@openpeepshq/core/server';

const log = logger('server:oauth');

const REGISTRATIONS_PER_HOUR = 10;

const statusFor = (code: OAuthErrorCode) =>
  code === 'invalid_client' || code === 'invalid_token'
    ? 401
    : code === 'registration_disabled' || code === 'insufficient_scope'
      ? 403
      : 400;

const field = (req: Request, name: string): string | undefined => {
  const value = (req.body as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' && value ? value : undefined;
};

/** RFC 6749 §2.3.1: HTTP Basic (form-encoded parts) or body parameters. */
const clientCredentials = (req: Request) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString();
    const separator = decoded.indexOf(':');
    return {
      viaHeader: true,
      clientId: decodeURIComponent(decoded.slice(0, separator)),
      clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
    };
  }
  return {
    viaHeader: false,
    clientId: field(req, 'client_id'),
    clientSecret: field(req, 'client_secret'),
  };
};

// RFC 6749 §2.3.1: with HTTP Basic the client_id rides in the header, so a
// copy in the body is malformed.
const rejectBodyClientId = (req: Request, viaHeader: boolean) => {
  if (viaHeader && field(req, 'client_id')) {
    throw oauthError(
      'invalid_request',
      'client_id must not be sent in the body when using HTTP Basic',
    );
  }
};

const bearerToken = (req: Request) => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ')
    ? header.slice(7)
    : field(req, 'access_token');
};

/** Runs a protocol handler and answers in RFC 6749 §5.2 error format. */
const handle =
  (fn: (req: Request) => Promise<unknown>, status = 200): RequestHandler =>
  async (req, res) => {
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    try {
      res.status(status).json(await fn(req));
    } catch (error) {
      if (!isOAuthError(error)) {
        log.error('OAuth endpoint failed', error);
        res.status(500).json({ error: 'server_error' });
        return;
      }
      const code = error.oauthError;
      if (code === 'invalid_token') {
        res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      } else if (code === 'insufficient_scope') {
        res.set(
          'WWW-Authenticate',
          'Bearer error="insufficient_scope", scope="openid"',
        );
      } else if (code === 'invalid_client' && req.headers.authorization) {
        res.set('WWW-Authenticate', 'Basic');
      }
      res.status(statusFor(code)).json({
        error: code === 'registration_disabled' ? 'access_denied' : code,
        error_description: error.message,
      });
    }
  };

// Protocol endpoints serve third-party apps, including browser SPAs on other
// origins, and never rely on cookies — so CORS is open, unlike the main API.
const openCors: RequestHandler = (req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  });
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
};

const registrationRateLimit: RequestHandler = async (req, res, next) => {
  const redis = await getSharedConnection();
  const key = `oauth:register:${req.ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60 * 60);
  }
  if (count > REGISTRATIONS_PER_HOUR) {
    res.status(429).json({
      error: 'invalid_request',
      error_description: 'Too many registrations, try again later',
    });
    return;
  }
  next();
};

const formBody = [express.urlencoded({ extended: false }), express.json()];

/**
 * OAuth 2.0 / OIDC protocol endpoints. Mounted as plain Express routes before
 * the narrow API CORS and Riddl: they speak the RFC wire formats (form bodies,
 * Basic client auth, `{error}` bodies). The consent and grant APIs under the
 * same prefix fall through to Riddl.
 */
export const installOAuthEndpoints = (app: Express) => {
  app.get(
    [
      '/.well-known/openid-configuration',
      '/.well-known/oauth-authorization-server',
    ],
    openCors,
    async (_req, res) => {
      res.json(
        oauthDiscoveryDocument({
          issuer: await serverRootUrl(),
          registrationEnabled: !!(await config()).oauth?.dynamicRegistration,
        }),
      );
    },
  );

  const router = express.Router();
  router.use(
    ['/token', '/revoke', '/userinfo', '/register', '/jwks'],
    openCors,
  );

  router.get('/jwks', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600').json(await oauthJwks());
  });

  router.post(
    '/token',
    ...formBody,
    handle(async (req) => {
      const { viaHeader, clientId, clientSecret } = clientCredentials(req);
      rejectBodyClientId(req, viaHeader);
      const client = await authenticateOAuthClient(clientId, clientSecret);
      const issuer = await serverRootUrl();
      switch (field(req, 'grant_type')) {
        case 'authorization_code':
          return exchangeOAuthAuthorizationCode({
            issuer,
            client,
            code: field(req, 'code'),
            redirectUri: field(req, 'redirect_uri'),
            codeVerifier: field(req, 'code_verifier'),
          });
        case 'refresh_token':
          return exchangeOAuthRefreshToken({
            issuer,
            client,
            refreshToken: field(req, 'refresh_token'),
            scope: field(req, 'scope'),
          });
        default:
          throw oauthError(
            'unsupported_grant_type',
            'Supported grants: authorization_code, refresh_token',
          );
      }
    }),
  );

  router.post(
    '/revoke',
    ...formBody,
    handle(async (req) => {
      const { viaHeader, clientId, clientSecret } = clientCredentials(req);
      rejectBodyClientId(req, viaHeader);
      const client = await authenticateOAuthClient(clientId, clientSecret);
      const token = field(req, 'token');
      if (!token) {
        throw oauthError('invalid_request', 'token is required');
      }
      await revokeOAuthToken({ client, token });
      return {};
    }),
  );

  const userinfo = handle(async (req) => {
    const token = bearerToken(req);
    if (!token) {
      throw oauthError('invalid_token', 'A bearer token is required');
    }
    return oauthUserinfo(token);
  });
  router.get('/userinfo', userinfo);
  router.post('/userinfo', ...formBody, userinfo);

  router.post(
    '/register',
    registrationRateLimit,
    express.json(),
    handle((req) => registerOAuthClient(req.body), 201),
  );

  app.use(OAUTH_API_PATH, router);
};
