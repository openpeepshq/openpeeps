import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  existsAccountByEmail,
  findAccountByEmail,
} from '@openpeepshq/core/accounts';
import {
  existsProfileByHandle,
  findProfileByHandle,
} from '@openpeepshq/core/profiles';
import {
  apiHeaders,
  currentProfile,
  getAdminConfig,
  loginUser,
  patchAdminConfig,
  uniqueHandle,
} from '../../../../../../../helpers/api';

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';

const registrationBody = (prefix: string) => {
  const handle = uniqueHandle(prefix);
  return {
    handle,
    email: `${handle}@openpeeps.test`,
    password: 'testtest12',
    displayName: `Reg ${handle}`,
    privacyPolicyAccepted: true,
  };
};

const createServiceToken = async (
  request: APIRequestContext,
  ownerToken: string,
  scopeLevel: 'read' | 'write',
): Promise<string> => {
  const response = await request.post(
    '/api/openpeeps/core/v1/admin/service-access-tokens',
    {
      headers: apiHeaders(ownerToken),
      data: {
        name: `register-${scopeLevel}-${Date.now()}`,
        scopes: [{ scopeLevel, resource: { type: 'profiles', id: '*' } }],
        expirationTime: '1h',
      },
    },
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  const tokenResponse = await response.json();
  expect(typeof tokenResponse.signedToken).toBe('string');
  return tokenResponse.signedToken;
};

const withClosedSignUps = async (
  request: APIRequestContext,
  ownerToken: string,
  run: () => Promise<void>,
) => {
  const configResponse = await getAdminConfig(
    request,
    ownerToken,
    'openpeeps',
    'core',
  );
  const originalConfig = configResponse.config;

  try {
    await patchAdminConfig(request, ownerToken, 'openpeeps', 'core', {
      ...originalConfig,
      server: { ...originalConfig.server, signUpsOpen: false },
    });
    await run();
  } finally {
    await patchAdminConfig(
      request,
      ownerToken,
      'openpeeps',
      'core',
      originalConfig,
    );
  }
};

const expectSuccessfulRegister = async (
  request: APIRequestContext,
  response: Awaited<ReturnType<APIRequestContext['post']>>,
  body: ReturnType<typeof registrationBody>,
  options: { emailValidated?: boolean } = {},
) => {
  const responseJson = await response.json();
  expect(
    response.status(),
    `register failed: ${response.status()} ${JSON.stringify(responseJson)}`,
  ).toBe(200);
  expect(responseJson.success).toBe(true);
  expect(typeof responseJson.token).toBe('string');

  const profile = await currentProfile(request, responseJson.token);
  expect(profile.handle).toBe(body.handle);

  const account = await findAccountByEmail(body.email);
  const storedProfile = await findProfileByHandle(body.handle);
  expect(storedProfile?.id).toBe(profile.id);
  expect(account?.profiles.some(({ id }) => id === profile.id)).toBe(true);
  if (options.emailValidated !== undefined) {
    expect(account?.emailValidated).toBe(options.emailValidated);
  }
};

test.describe('auth register flows', () => {
  test('1. open -> ok', async ({ request }) => {
    const body = registrationBody('open');
    const response = await request.post(
      '/api/openpeeps/core/v1/auth/register',
      { data: body },
    );
    await expectSuccessfulRegister(request, response, body, {
      emailValidated: false,
    });
  });

  test('2. closed / no token -> fail', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const body = registrationBody('nt');

    await withClosedSignUps(request, ownerToken, async () => {
      expect(await existsAccountByEmail(body.email)).toBe(false);
      expect(await existsProfileByHandle(body.handle)).toBe(false);

      const response = await request.post(
        '/api/openpeeps/core/v1/auth/register',
        { data: body },
      );
      const responseJson = await response.json();

      expect(response.status()).toBe(403);
      expect(responseJson).toMatchObject({
        message: 'Sign-ups are closed and no valid invite code provided',
      });
      expect(await existsAccountByEmail(body.email)).toBe(false);
      expect(await existsProfileByHandle(body.handle)).toBe(false);
    });
  });

  test('3. closed / service token -> ok', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const serviceToken = await createServiceToken(request, ownerToken, 'write');
    const body = registrationBody('svc');

    await withClosedSignUps(request, ownerToken, async () => {
      const response = await request.post(
        '/api/openpeeps/core/v1/auth/register',
        {
          headers: apiHeaders(serviceToken),
          data: body,
        },
      );
      await expectSuccessfulRegister(request, response, body, {
        emailValidated: true,
      });
    });
  });

  test('4. closed / owner token -> ok', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const body = registrationBody('ow');

    await withClosedSignUps(request, ownerToken, async () => {
      const response = await request.post(
        '/api/openpeeps/core/v1/auth/register',
        {
          headers: apiHeaders(ownerToken),
          data: body,
        },
      );
      await expectSuccessfulRegister(request, response, body, {
        emailValidated: true,
      });
    });
  });

  test('5. closed / wrong scope -> fail', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const serviceToken = await createServiceToken(request, ownerToken, 'read');
    const body = registrationBody('bs');

    await withClosedSignUps(request, ownerToken, async () => {
      expect(await existsAccountByEmail(body.email)).toBe(false);
      expect(await existsProfileByHandle(body.handle)).toBe(false);

      const response = await request.post(
        '/api/openpeeps/core/v1/auth/register',
        {
          headers: apiHeaders(serviceToken),
          data: body,
        },
      );
      const responseJson = await response.json();

      expect(response.status()).toBe(403);
      expect(responseJson).toMatchObject({
        message: 'auth.scope.not-authorized',
      });
      expect(await existsAccountByEmail(body.email)).toBe(false);
      expect(await existsProfileByHandle(body.handle)).toBe(false);
    });
  });
});
