import { expect, test } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import {
  apiHeaders,
  getAdminConfig,
  loginUser,
  patchAdminConfig,
  registerUser,
  uniqueHandle,
} from '../../../../../../../helpers/api';

// End-to-end wire coverage for the OAuth 2.0 / OIDC protocol router
// (platform/server/src/lib/oauth.ts) and the consent / grant / admin-client
// APIs under the same prefix. These hit the real Express + Riddl server over
// HTTP, exercising the form/Basic client auth, Redis code redemption, PKCE,
// refresh rotation and CORS headers that the mock-based unit tests cannot.
//
// Discovered routes:
//   /.well-known/openid-configuration            (discovery)
//   /api/openpeeps/core/v1/oauth/jwks            (RS256 signing key)
//   /api/openpeeps/core/v1/oauth/token           (authorization_code + refresh_token)
//   /api/openpeeps/core/v1/oauth/userinfo        (OIDC claims)
//   /api/openpeeps/core/v1/oauth/revoke          (RFC 7009)
//   /api/openpeeps/core/v1/oauth/register        (RFC 7591, off by default)
//   /api/openpeeps/core/v1/oauth/authorize       (consent describe/decide, Riddl)
//   /api/openpeeps/core/v1/oauth/grants[/:id]    (connected apps, Riddl)
//   /api/openpeeps/core/v1/admin/oauth/clients   (admin client management, Riddl)

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';

// Loopback redirect per RFC 8252; native apps bind an ephemeral port, so any
// port on 127.0.0.1 matches the registered URI.
const REGISTERED_REDIRECT = 'http://127.0.0.1:9999/callback';

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

const pkce = () => {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};

const ownerToken = async (request: APIRequestContext) =>
  (await loginUser(request, OWNER_EMAIL, OWNER_PASSWORD)).token;

// A fresh public (non-confidential, PKCE-only) OAuth client for this test.
const createPublicClient = async (
  request: APIRequestContext,
  token: string,
) => {
  const response = await request.post(
    '/api/openpeeps/core/v1/admin/oauth/clients',
    {
      headers: apiHeaders(token),
      data: {
        name: `itest-${Date.now().toString(36)}${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        redirectUris: [REGISTERED_REDIRECT],
        confidential: false,
        firstParty: false,
      },
    },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as {
    id: string;
    name: string;
    redirectUris: string[];
    confidential: boolean;
  };
};

const authorizeQuery = (params: Record<string, string>) =>
  `?${new URLSearchParams(params).toString()}`;

// Drives describe (GET) then decide (POST approve) and returns the issued code.
const obtainCode = async (
  request: APIRequestContext,
  userToken: string,
  clientId: string,
  redirectUri: string,
  challenge: string,
  state: string,
) => {
  // The decide POST must echo the described request verbatim (as the SPA
  // hook does): without `scope` the code falls back to the default scope
  // and drops everything the describe step agreed to.
  const base = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'openid profile email offline_access',
  };
  const describe = await request.get(
    `/api/openpeeps/core/v1/oauth/authorize${authorizeQuery(base)}`,
    { headers: apiHeaders(userToken) },
  );
  expect(describe.ok(), await describe.text()).toBeTruthy();
  const describeBody = (await describe.json()) as {
    status: string;
    autoApprove: boolean;
  };
  expect(describeBody.status).toBe('consent');
  expect(describeBody.autoApprove).toBe(false);

  const decide = await request.post(
    `/api/openpeeps/core/v1/oauth/authorize${authorizeQuery(base)}`,
    { headers: apiHeaders(userToken), data: { ...base, approve: true } },
  );
  expect(decide.ok(), await decide.text()).toBeTruthy();
  const { redirectUrl } = (await decide.json()) as { redirectUrl: string };
  const code = new URL(redirectUrl).searchParams.get('code');
  expect(code, `no code in redirect: ${redirectUrl}`).toBeTruthy();
  expect(new URL(redirectUrl).searchParams.get('state')).toBe(state);
  return code as string;
};

// The RFC wire format is a form-encoded body. Playwright's `form:` sends it
// as application/x-www-form-urlencoded (an object `data:` would be JSON).
const tokenGrant = (request: APIRequestContext, body: Record<string, string>) =>
  request.post('/api/openpeeps/core/v1/oauth/token', { form: body });

test.describe('OAuth 2.0 / OIDC protocol', () => {
  test('serves the discovery document and JWKS', async ({ request }) => {
    const discovery = await request.get('/.well-known/openid-configuration');
    expect(discovery.ok()).toBeTruthy();
    const doc = (await discovery.json()) as Record<string, unknown>;
    expect(typeof doc.issuer).toBe('string');
    expect(doc.token_endpoint).toContain('/api/openpeeps/core/v1/oauth/token');
    expect(doc.userinfo_endpoint).toContain('/oauth/userinfo');
    expect(doc.jwks_uri).toContain('/oauth/jwks');
    expect(doc.revocation_endpoint).toContain('/oauth/revoke');
    // Dynamic registration is off by default, so the endpoint is not advertised.
    expect(doc.registration_endpoint).toBeUndefined();

    const jwks = await request.get('/api/openpeeps/core/v1/oauth/jwks');
    expect(jwks.ok()).toBeTruthy();
    const keys = (
      (await jwks.json()) as { keys: Array<Record<string, unknown>> }
    ).keys;
    expect(keys.length).toBe(1);
    expect(keys[0].alg).toBe('RS256');
    expect(keys[0].kty).toBe('RSA');
    expect(keys[0].kid).toBeTruthy();
  });

  test('rejects dynamic registration while disabled', async ({ request }) => {
    const response = await request.post(
      '/api/openpeeps/core/v1/oauth/register',
      {
        data: {
          redirect_uris: [REGISTERED_REDIRECT],
          client_name: 'disabled-app',
        },
      },
    );
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('access_denied');
  });

  test('full flow: consent -> token -> userinfo -> refresh -> revoke', async ({
    request,
  }) => {
    const owner = await ownerToken(request);
    const client = await createPublicClient(request, owner);
    const userEmail = `oidc${Date.now().toString(36)}@openpeeps.test`;
    const user = await registerUser(request, {
      handle: uniqueHandle('oidc'),
      email: userEmail,
      password: 'testtest12',
    });
    const { verifier, challenge } = pkce();

    // 1. Consent + code (PKCE S256).
    const code = await obtainCode(
      request,
      user.token,
      client.id,
      REGISTERED_REDIRECT,
      challenge,
      'state-abc',
    );

    // 2. Authorization-code grant with the matching verifier.
    const tokenRes = await tokenGrant(request, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REGISTERED_REDIRECT,
      client_id: client.id,
      code_verifier: verifier,
    });
    expect(tokenRes.status(), await tokenRes.text()).toBe(200);
    const tokens = (await tokenRes.json()) as TokenResponse;
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.expires_in).toBe(3600);
    expect(tokens.access_token).toBeTruthy();
    // offline_access was granted -> a rotating refresh token is issued.
    expect(tokens.refresh_token).toBeTruthy();
    // openid was granted -> an id_token is present.
    expect(tokens.id_token).toBeTruthy();
    expect(tokens.scope).toContain('openid');
    expect(
      (tokenRes.headers()['cache-control'] ?? '').includes('no-store'),
      'token responses must not be cached',
    ).toBeTruthy();

    // 3. Userinfo with the access token.
    const userInfo = await request.get(
      '/api/openpeeps/core/v1/oauth/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    expect(userInfo.ok(), await userInfo.text()).toBeTruthy();
    const claims = (await userInfo.json()) as Record<string, string>;
    expect(claims.sub).toBeTruthy();
    expect(claims.email).toBe(userEmail);

    // 4. Refresh rotation: the old token is single-use, a new one is issued.
    const refreshRes = await tokenGrant(request, {
      grant_type: 'refresh_token',
      client_id: client.id,
      refresh_token: tokens.refresh_token as string,
    });
    expect(refreshRes.status(), await refreshRes.text()).toBe(200);
    const refreshed = (await refreshRes.json()) as TokenResponse;
    expect(refreshed.access_token).toBeTruthy();
    expect(refreshed.refresh_token).toBeTruthy();
    expect(refreshed.refresh_token).not.toBe(tokens.refresh_token);

    // Reusing the already-consumed refresh token is a leak: the family dies.
    const reuse = await tokenGrant(request, {
      grant_type: 'refresh_token',
      client_id: client.id,
      refresh_token: tokens.refresh_token as string,
    });
    expect(reuse.status()).toBe(400);
    expect(((await reuse.json()) as TokenResponse).error).toBe('invalid_grant');

    // 5. Revoke the access token (RFC 7009); it must stop working.
    const revoke = await request.post('/api/openpeeps/core/v1/oauth/revoke', {
      form: {
        client_id: client.id,
        token: refreshed.access_token as string,
      },
    });
    expect(revoke.ok(), await revoke.text()).toBeTruthy();

    const afterRevoke = await request.get(
      '/api/openpeeps/core/v1/oauth/userinfo',
      { headers: { Authorization: `Bearer ${refreshed.access_token}` } },
    );
    expect(afterRevoke.status()).toBe(401);
  });

  test('enforces PKCE: a mismatched verifier is rejected', async ({
    request,
  }) => {
    const owner = await ownerToken(request);
    const client = await createPublicClient(request, owner);
    const user = await registerUser(request, {
      handle: uniqueHandle('pkce'),
      email: `pkce${Date.now().toString(36)}@openpeeps.test`,
      password: 'testtest12',
    });
    const { verifier, challenge } = pkce();
    const code = await obtainCode(
      request,
      user.token,
      client.id,
      REGISTERED_REDIRECT,
      challenge,
      'pkce-state',
    );

    const wrongVerifier = randomBytes(48).toString('base64url');
    const bad = await tokenGrant(request, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REGISTERED_REDIRECT,
      client_id: client.id,
      code_verifier: wrongVerifier,
    });
    expect(bad.status()).toBe(400);
    expect(((await bad.json()) as TokenResponse).error).toBe('invalid_grant');
  });

  test('authorization codes are single-use', async ({ request }) => {
    const owner = await ownerToken(request);
    const client = await createPublicClient(request, owner);
    const user = await registerUser(request, {
      handle: uniqueHandle('once'),
      email: `once${Date.now().toString(36)}@openpeeps.test`,
      password: 'testtest12',
    });
    const { verifier, challenge } = pkce();
    const code = await obtainCode(
      request,
      user.token,
      client.id,
      REGISTERED_REDIRECT,
      challenge,
      'once-state',
    );
    const body = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REGISTERED_REDIRECT,
      client_id: client.id,
      code_verifier: verifier,
    };

    const first = await tokenGrant(request, body);
    expect(first.status(), await first.text()).toBe(200);

    const second = await tokenGrant(request, body);
    expect(second.status()).toBe(400);
    expect(((await second.json()) as TokenResponse).error).toBe(
      'invalid_grant',
    );
  });

  test('loopback redirect URIs match on any port (RFC 8252)', async ({
    request,
  }) => {
    const owner = await ownerToken(request);
    const client = await createPublicClient(request, owner);
    const user = await registerUser(request, {
      handle: uniqueHandle('loop'),
      email: `loop${Date.now().toString(36)}@openpeeps.test`,
      password: 'testtest12',
    });
    const { challenge } = pkce();
    // A different ephemeral port than the registered one.
    const describe = await request.get(
      `/api/openpeeps/core/v1/oauth/authorize${authorizeQuery({
        response_type: 'code',
        client_id: client.id,
        redirect_uri: 'http://127.0.0.1:8000/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: 'loop-state',
      })}`,
      { headers: apiHeaders(user.token) },
    );
    expect(describe.ok(), await describe.text()).toBeTruthy();
    expect(((await describe.json()) as { status: string }).status).toBe(
      'consent',
    );
  });

  test('revoking a connected app invalidates its refresh tokens', async ({
    request,
  }) => {
    const owner = await ownerToken(request);
    const client = await createPublicClient(request, owner);
    const user = await registerUser(request, {
      handle: uniqueHandle('grant'),
      email: `grant${Date.now().toString(36)}@openpeeps.test`,
      password: 'testtest12',
    });
    const { verifier, challenge } = pkce();
    const code = await obtainCode(
      request,
      user.token,
      client.id,
      REGISTERED_REDIRECT,
      challenge,
      'grant-state',
    );
    const tokenRes = await tokenGrant(request, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REGISTERED_REDIRECT,
      client_id: client.id,
      code_verifier: verifier,
    });
    const tokens = (await tokenRes.json()) as TokenResponse;
    expect(tokens.refresh_token).toBeTruthy();

    // The grant shows up under the user's connected apps.
    const grants = await request.get('/api/openpeeps/core/v1/oauth/grants', {
      headers: apiHeaders(user.token),
    });
    expect(grants.ok(), await grants.text()).toBeTruthy();
    const grantList = (await grants.json()) as Array<{ clientId: string }>;
    expect(grantList.some((g) => g.clientId === client.id)).toBe(true);

    // Revoking the grant kills the family, so a pending refresh is rejected.
    const revokeGrant = await request.delete(
      `/api/openpeeps/core/v1/oauth/grants/${client.id}`,
      { headers: apiHeaders(user.token) },
    );
    expect(revokeGrant.ok(), await revokeGrant.text()).toBeTruthy();

    const refresh = await tokenGrant(request, {
      grant_type: 'refresh_token',
      client_id: client.id,
      refresh_token: tokens.refresh_token as string,
    });
    expect(refresh.status()).toBe(400);
    expect(((await refresh.json()) as TokenResponse).error).toBe(
      'invalid_grant',
    );
  });

  test('supports RFC 7591 dynamic registration when enabled', async ({
    request,
  }) => {
    const owner = await ownerToken(request);
    const before = await getAdminConfig(request, owner, 'openpeeps', 'core');

    try {
      await patchAdminConfig(request, owner, 'openpeeps', 'core', {
        ...before.config,
        oauth: { ...before.config.oauth, dynamicRegistration: true },
      });

      const response = await request.post(
        '/api/openpeeps/core/v1/oauth/register',
        {
          data: {
            redirect_uris: [REGISTERED_REDIRECT],
            client_name: 'dynamic-app',
            token_endpoint_auth_method: 'none',
          },
        },
      );
      expect(response.status(), await response.text()).toBe(201);
      const registered = (await response.json()) as {
        client_id: string;
        token_endpoint_auth_method: string;
      };
      expect(registered.client_id).toBeTruthy();
      expect(registered.token_endpoint_auth_method).toBe('none');
    } finally {
      await patchAdminConfig(
        request,
        owner,
        'openpeeps',
        'core',
        before.config,
      );
    }
  });
});
