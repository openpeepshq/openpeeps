import { expect, test } from '@playwright/test';

test('Register a new user', async ({ request }) => {
  const response = await request.post('/api/openpeeps/core/v1/auth/register', {
    data: {
      handle: 'test',
      email: 'test@test.com',
      password: 'testtest',
      privacyPolicyAccepted: true,
    },
  });

  const responseJson = await response.json();
  console.log(response);
  expect(response.ok()).toBeTruthy();
  expect(responseJson.success).toBeTruthy();
  expect(responseJson.token).toBeDefined();
});
