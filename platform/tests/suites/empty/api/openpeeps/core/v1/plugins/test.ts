import { expect, test } from '@playwright/test';

test('get plugin list', async ({ request }) => {
  const response = await request.get('/api/openpeeps/core/v1/plugins');

  expect(response.ok()).toBeTruthy();

  const plugins = await response.json();
  expect(Array.isArray(plugins)).toBeTruthy();
});

test('get plugin manifest', async ({ request }) => {
  const response = await request.get('/api/openpeeps/core/v1/plugins/manifest');

  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(Array.isArray(manifest)).toBeTruthy();
});

test('plugin asset access rejects invalid namespace', async ({ request }) => {
  const response = await request.get(
    '/plugin-assets/invalid_namespace/etc/web/foo.js',
  );
  expect(response.status()).toBe(403);
});

test('plugin asset access rejects unknown plugin', async ({ request }) => {
  const response = await request.get(
    '/plugin-assets/openpeeps/unknown-plugin/web/foo.js',
  );
  expect(response.status()).toBe(404);
});
