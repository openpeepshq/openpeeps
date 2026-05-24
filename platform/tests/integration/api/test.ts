import { expect, test } from '@playwright/test';

test('get OpenAPI json definition', async ({ request }) => {
  const response = await request.get('/api');

  expect(response.ok()).toBeTruthy();

  const responseJson = await response.json();

  expect(responseJson.openapi).toBe('3.0.0');
});
