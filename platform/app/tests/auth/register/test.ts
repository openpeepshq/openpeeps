import { expect, test } from '@playwright/test';

test('get registration form', async ({ page }) => {
  await page.goto('/auth/register');

  await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
});
