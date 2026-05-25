import { expect, test } from '@playwright/test';
import { testIds } from '../../testIds';

test('get registration form', async ({ page }) => {
  await page.goto('/auth/register');

  await expect(page.getByTestId(testIds.auth.registerSubmit)).toBeVisible();
});
