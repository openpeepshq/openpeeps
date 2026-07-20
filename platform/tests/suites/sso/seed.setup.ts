import { expect, test as setup } from '@playwright/test';
import { getServerInfo, loginUser, patchAdminConfig } from '../../helpers/api';
import { waitForBaseUrl } from '../empty/wait-for-base-url';

const owner = {
  handle: 'ssowner',
  email: 'sso-owner@openpeeps.test',
  password: 'testtesttest',
  displayName: 'SSO Owner',
};

const oauthIssuer =
  process.env.OAUTH_ISSUER_URL ?? 'http://127.0.0.1:8081/default';

setup('seed SSO owner and OIDC config', async ({ request, baseURL }) => {
  await waitForBaseUrl(baseURL ?? 'http://127.0.0.1:8080');

  const registered = await request.post(
    '/api/openpeeps/core/v1/auth/register',
    {
      data: {
        handle: owner.handle,
        displayName: owner.displayName,
        email: owner.email,
        password: owner.password,
        privacyPolicyAccepted: true,
      },
    },
  );
  expect(
    registered.ok() || registered.status() === 409,
    `could not seed SSO owner: ${registered.status()} ${await registered.text()}`,
  ).toBeTruthy();

  const { token } = await loginUser(request, owner.email, owner.password);

  await patchAdminConfig(request, token, 'openpeeps', 'core', {
    sso: {
      oidc: [
        {
          id: 'mock',
          name: 'Mock OIDC',
          authorizationUrl: `${oauthIssuer}/authorize`,
          tokenUrl: `${oauthIssuer}/token`,
          userinfoUrl: `${oauthIssuer}/userinfo`,
          jwksUri: `${oauthIssuer}/jwks`,
          clientId: 'openpeeps-integration',
          clientSecret: 'openpeeps-integration-secret',
          scope: 'openid email profile',
          claimMapping: {
            email: 'email',
            handle: 'preferred_username',
            displayName: 'name',
          },
          approvalRequired: false,
        },
      ],
    },
  });

  const info = await getServerInfo(request);
  const providers = info.sso?.oidc ?? [];
  expect(
    providers.some((provider: { id: string }) => provider.id === 'mock'),
    `OIDC mock provider missing after seed; OAUTH_ISSUER_URL=${oauthIssuer}; info.sso=${JSON.stringify(info.sso)}`,
  ).toBe(true);
});
