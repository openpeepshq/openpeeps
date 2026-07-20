import { test as setup, expect } from '@playwright/test';
import { waitForBaseUrl } from '../empty/wait-for-base-url';

const livekitConfigured = () => {
  const key = process.env.JAMS_LIVEKIT_API_KEY ?? '';
  const secret = process.env.JAMS_LIVEKIT_API_SECRET ?? '';
  const url = process.env.JAMS_LIVEKIT_URL ?? '';
  if (!key || !secret || !url) return false;
  if (key.startsWith('APIxxxx') || secret.startsWith('xxxxx')) return false;
  return true;
};

setup('seed jams owner', async ({ request, baseURL }) => {
  if (!livekitConfigured()) {
    setup.skip(true, 'JAMS_LIVEKIT_* not configured with real credentials');
    return;
  }

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
