import { expect, test } from '@playwright/test';

test('Register a new user', async ({ request }) => {
  const uniqueId = `t${Date.now().toString(36).slice(-7)}${Math.random().toString(36).slice(2, 8)}`;

  const response = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: {
      handle: uniqueId,
      email: `test+${uniqueId}@test.com`,
      password: 'testtest',
      privacyPolicyAccepted: true,
    },
  });

  const responseJson = await response.json();
  expect(
    response.ok(),
    `registration failed: ${response.status()} ${JSON.stringify(responseJson)}`,
  ).toBeTruthy();
  expect(responseJson.success).toBeTruthy();
  expect(responseJson.token).toBeDefined();
});
