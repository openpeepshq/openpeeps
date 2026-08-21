import { test as setup, expect } from '@playwright/test';
import { waitForBaseUrl } from '../empty/wait-for-base-url';

setup('seed jams owner', async ({ request, baseURL }) => {
  await waitForBaseUrl(baseURL ?? 'http://127.0.0.1:8080');

  const response = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: {
      handle: 'jamsowner',
      displayName: 'Jams Owner',
      email: 'jams-owner@openpeeps.test',
      password: 'testtesttest',
      privacyPolicyAccepted: true,
    },
  });
  expect(
    response.ok() || response.status() === 409,
    `jams setup register failed: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
});
