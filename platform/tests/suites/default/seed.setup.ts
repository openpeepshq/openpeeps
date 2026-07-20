import { test as setup, expect } from '@playwright/test';
import { restoreBackupFixture } from '../../helpers/backup';
import { waitForBaseUrl } from '../empty/wait-for-base-url';

setup('restore default-install fixture', async ({ request, baseURL }) => {
  if (process.env.INTEGRATION_SKIP_RESTORE !== 'true') {
    await restoreBackupFixture('default-install');
  }

  const url = baseURL ?? 'http://127.0.0.1:8080';
  await waitForBaseUrl(url);

  const health = await request.get('/health');
  expect(health.ok(), 'default suite: web not healthy after restore').toBeTruthy();
});
