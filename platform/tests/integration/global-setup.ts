import { request, type FullConfig } from '@playwright/test';
import { waitForBaseUrl } from './wait-for-base-url';

// Pre-registers the well-known UI fixture user so it ends up as the FIRST
// account in the test database. The first account becomes the community
// `owner` (see platform/core/src/accounts/mutations.ts), which is what every
// auth-required UI test relies on (it needs `core-groups-create` etc.).
//
// Without this hook the alphabetically-earlier `platform/tests/integration/api/.../auth/test.ts`
// registers a random user that becomes the owner, leaving the UI fixture
// user as a `pendingmember` and breaking every UI test downstream.
export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:8080';

  await waitForBaseUrl(baseURL);

  const ctx = await request.newContext({ baseURL });

  try {
    const response = await ctx.post(
      '/api/openpeeps/core/v1/auth/register',
      {
        data: {
          handle: 'test',
          displayName: 'test',
          email: 'test@test.com',
          password: 'testtest',
          privacyPolicyAccepted: true,
        },
      },
    );

    // 409 (or any 4xx with a "handle/email already taken" body) means the
    // user already exists from a previous run on a non-clean DB. The UI
    // fixture will fall back to login in that case, which is fine.
    if (!response.ok() && response.status() !== 409) {
      throw new Error(
        `globalSetup: could not seed UI owner: ${response.status()} ${await response.text()}`,
      );
    }
  } finally {
    await ctx.dispose();
  }
}
