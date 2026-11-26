import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const mocks = vi.hoisted(() => {
  const oauthError = (code: string, description: string) =>
    Object.assign(new Error(description), { oauthError: code });
  return {
    oauthError,
    dynamicRegistration: false,
    redisCounts: new Map<string, number>(),
    authenticateOAuthClient: vi.fn(),
    exchangeOAuthAuthorizationCode: vi.fn(),
    exchangeOAuthRefreshToken: vi.fn(),
    oauthUserinfo: vi.fn(),
    registerOAuthClient: vi.fn(),
    revokeOAuthToken: vi.fn(),
  };
});

vi.mock('@openpeepshq/core/oauth', () => ({
  authenticateOAuthClient: mocks.authenticateOAuthClient,
  exchangeOAuthAuthorizationCode: mocks.exchangeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken: mocks.exchangeOAuthRefreshToken,
  oauthUserinfo: mocks.oauthUserinfo,
  registerOAuthClient: mocks.registerOAuthClient,
  revokeOAuthToken: mocks.revokeOAuthToken,
  oauthError: mocks.oauthError,
  isOAuthError: (e: unknown) => e instanceof Error && 'oauthError' in e,
  oauthJwks: async () => ({ keys: [{ kid: 'k1' }] }),
  oauthDiscoveryDocument: ({
    issuer,
    registrationEnabled,
  }: {
    issuer: string;
    registrationEnabled: boolean;
  }) => ({ issuer, registrationEnabled }),
}));
vi.mock('@openpeepshq/core/config', () => ({
  config: async () => ({
    oauth: { dynamicRegistration: mocks.dynamicRegistration },
  }),
}));
vi.mock('@openpeepshq/core/server', () => ({
  serverRootUrl: async () => 'https://peeps.example',
}));
vi.mock('@openpeepshq/core/redis', () => ({
  getSharedConnection: async () => ({
    incr: async (key: string) => {
      const next = (mocks.redisCounts.get(key) ?? 0) + 1;
      mocks.redisCounts.set(key, next);
      return next;
    },
    expire: async () => true,
  }),
}));
vi.mock('@openpeepshq/core/log', () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { installOAuthEndpoints } from '../oauth';

const api = '/api/openpeeps/core/v1/oauth';
const client = { id: 'c1', name: 'App' };
let server: Server;
let base: string;

const form = (body: Record<string, string>, headers = {}) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...headers,
  },
  body: new URLSearchParams(body).toString(),
});

beforeAll(async () => {
  const app = express();
  installOAuthEndpoints(app);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.on('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dynamicRegistration = false;
  mocks.redisCounts.clear();
  mocks.authenticateOAuthClient.mockResolvedValue(client);
});

describe('discovery', () => {
  it('serves OIDC and RFC 8414 metadata with open CORS', async () => {
    for (const path of [
      '/.well-known/openid-configuration',
      '/.well-known/oauth-authorization-server',
    ]) {
      const response = await fetch(`${base}${path}`);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(await response.json()).toEqual({
        issuer: 'https://peeps.example',
        registrationEnabled: false,
      });
    }
  });

  it('serves the JWKS', async () => {
    const response = await fetch(`${base}${api}/jwks`);
    expect(await response.json()).toEqual({ keys: [{ kid: 'k1' }] });
  });
});

describe('token endpoint', () => {
  it('exchanges an authorization code for a public client', async () => {
    mocks.exchangeOAuthAuthorizationCode.mockResolvedValue({
      access_token: 'a',
    });
    const response = await fetch(
      `${base}${api}/token`,
      form({
        grant_type: 'authorization_code',
        client_id: 'c1',
        code: 'code1',
        redirect_uri: 'org.example.app:/cb',
        code_verifier: 'v',
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ access_token: 'a' });
    expect(mocks.authenticateOAuthClient).toHaveBeenCalledWith('c1', undefined);
    expect(mocks.exchangeOAuthAuthorizationCode).toHaveBeenCalledWith({
      issuer: 'https://peeps.example',
      client,
      code: 'code1',
      redirectUri: 'org.example.app:/cb',
      codeVerifier: 'v',
    });
  });

  it('reads confidential client credentials from HTTP Basic', async () => {
    mocks.exchangeOAuthRefreshToken.mockResolvedValue({ access_token: 'b' });
    const basic = Buffer.from('c1:s%3Acret').toString('base64');
    await fetch(
      `${base}${api}/token`,
      form(
        { grant_type: 'refresh_token', refresh_token: 'r1' },
        { Authorization: `Basic ${basic}` },
      ),
    );
    expect(mocks.authenticateOAuthClient).toHaveBeenCalledWith('c1', 's:cret');
    expect(mocks.exchangeOAuthRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'r1', scope: undefined }),
    );
  });

  it('answers client failures in RFC 6749 error format', async () => {
    mocks.authenticateOAuthClient.mockRejectedValue(
      mocks.oauthError('invalid_client', 'Client authentication failed'),
    );
    const response = await fetch(
      `${base}${api}/token`,
      form(
        { grant_type: 'authorization_code' },
        { Authorization: `Basic ${Buffer.from('c1:x').toString('base64')}` },
      ),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Basic');
    expect(await response.json()).toEqual({
      error: 'invalid_client',
      error_description: 'Client authentication failed',
    });
  });

  it('rejects a client_id in the body when HTTP Basic is used', async () => {
    const response = await fetch(
      `${base}${api}/token`,
      form(
        {
          grant_type: 'authorization_code',
          client_id: 'c1',
          code: 'code1',
        },
        {
          Authorization: `Basic ${Buffer.from('c1:x').toString('base64')}`,
        },
      ),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'invalid_request',
    });
    expect(mocks.authenticateOAuthClient).not.toHaveBeenCalled();
    expect(mocks.exchangeOAuthAuthorizationCode).not.toHaveBeenCalled();
  });

  it('rejects unsupported grant types', async () => {
    const response = await fetch(
      `${base}${api}/token`,
      form({ grant_type: 'password', client_id: 'c1' }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('unsupported_grant_type');
  });

  it('answers CORS preflights itself', async () => {
    const response = await fetch(`${base}${api}/token`, { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('hides internal failures', async () => {
    mocks.exchangeOAuthAuthorizationCode.mockRejectedValue(new Error('db'));
    const response = await fetch(
      `${base}${api}/token`,
      form({ grant_type: 'authorization_code', client_id: 'c1' }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'server_error' });
  });
});

describe('userinfo endpoint', () => {
  it('requires a bearer token', async () => {
    const response = await fetch(`${base}${api}/userinfo`);
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe(
      'Bearer error="invalid_token"',
    );
    expect(mocks.oauthUserinfo).not.toHaveBeenCalled();
  });

  it('returns the claims for the bearer token', async () => {
    mocks.oauthUserinfo.mockResolvedValue({ sub: 'p1' });
    const response = await fetch(`${base}${api}/userinfo`, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(await response.json()).toEqual({ sub: 'p1' });
    expect(mocks.oauthUserinfo).toHaveBeenCalledWith('tok');
  });

  it('answers 403 insufficient_scope when the token lacks openid', async () => {
    mocks.oauthUserinfo.mockRejectedValue(
      mocks.oauthError('insufficient_scope', 'missing openid'),
    );
    const response = await fetch(`${base}${api}/userinfo`, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(response.status).toBe(403);
    expect(response.headers.get('www-authenticate')).toBe(
      'Bearer error="insufficient_scope", scope="openid"',
    );
    expect(await response.json()).toEqual({
      error: 'insufficient_scope',
      error_description: 'missing openid',
    });
  });
});

describe('revocation endpoint', () => {
  it('revokes and answers 200 with an empty object', async () => {
    const response = await fetch(
      `${base}${api}/revoke`,
      form({ client_id: 'c1', token: 't' }),
    );
    expect(response.status).toBe(200);
    expect(mocks.revokeOAuthToken).toHaveBeenCalledWith({ client, token: 't' });
  });
});

describe('registration endpoint', () => {
  const register = () =>
    fetch(`${base}${api}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['org.example.app:/cb'] }),
    });

  it('maps disabled registration to 403 access_denied', async () => {
    mocks.registerOAuthClient.mockRejectedValue(
      mocks.oauthError('registration_disabled', 'disabled'),
    );
    const response = await register();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe('access_denied');
  });

  it('returns 201 and rate-limits per IP', async () => {
    mocks.registerOAuthClient.mockResolvedValue({ client_id: 'c9' });
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await register()).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(mocks.registerOAuthClient).toHaveBeenCalledTimes(10);
  });
});

describe('other routes under the prefix', () => {
  it('fall through to the next handler (Riddl)', async () => {
    const response = await fetch(`${base}${api}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
