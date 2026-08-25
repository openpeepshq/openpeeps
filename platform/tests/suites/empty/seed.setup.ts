import { test as setup, expect } from '@playwright/test';
import { waitForBaseUrl } from './wait-for-base-url';

// Pre-registers the well-known UI fixture user so it ends up as the FIRST
// account in the test database. The first account becomes the community
// `owner` (see platform/core/src/accounts/mutations.ts), which is what every
// auth-required UI test relies on (it needs `core-groups-create` etc.).
// Welcome-guide overlays are off here: COMMUNITY_ONBOARDING_GUIDE_ENABLED=false
// on the web process (CI, Compose, and local Playwright webServer).
setup('seed UI owner', async ({ request, baseURL }) => {
  await waitForBaseUrl(baseURL ?? 'http://127.0.0.1:8080');

  const response = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: {
      handle: 'test',
      displayName: 'test',
      email: 'test@test.com',
      password: 'testtest',
      privacyPolicyAccepted: true,
    },
  });

  // 409 means the user already exists from a previous run.
  expect(
    response.ok() || response.status() === 409,
    `could not seed UI owner: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
});
