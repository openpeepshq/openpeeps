import { expect, test } from '@playwright/test';

test('get registration form', async ({ page }) => {
  await page.goto('/auth/register');

  await expect(page.getByText('Sign up')).toBeVisible();
});
