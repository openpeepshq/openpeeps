import { expect, test } from '@playwright/test';
import { getServerInfo } from '../../helpers/api';

test.describe('OIDC SSO', () => {
  test('server advertises the mock OIDC provider', async ({ request }) => {
    const info = await getServerInfo(request);
    const providers = info.sso?.oidc ?? [];
    expect(
      providers.some((provider: { id: string }) => provider.id === 'mock'),
    ).toBe(true);
  });

  test('authorize → callback establishes a session token', async ({
    page,
    baseURL,
  }) => {
    // Follow the browser OIDC redirect chain against the mock IdP.
    // Prefer commit/domcontentloaded: the SPA callback route does not need
    // a full load event, and hanging assets would otherwise false-timeout.
    await page.goto(
      `${baseURL}/api/openpeeps/core/v1/sso/oidc/mock/authorize?returnTo=/feeds/local`,
      { waitUntil: 'domcontentloaded' },
    );

    // Fallback if the mock IdP still shows interactive login/consent.
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    if (/login|authorize|consent|submit/i.test(bodyText)) {
      const username = page.locator('input[name="username"]');
      if (await username.isVisible().catch(() => false)) {
        await username.fill('ssooidc');
      }
      const submit = page.getByRole('button').first();
      if (await submit.isVisible().catch(() => false)) {
        await submit.click();
      }
    }

    try {
      await page.waitForURL(/\/auth\/sso\/oidc\/mock\/callback/, {
        timeout: 45_000,
        waitUntil: 'domcontentloaded',
      });
    } catch (err) {
      throw new Error(
        `SSO never reached SPA callback. currentURL=${page.url()} body=${bodyText.slice(0, 500)}`,
        { cause: err },
      );
    }

    const url = new URL(page.url());
    const token = url.searchParams.get('token');
    const error = url.searchParams.get('error');
    expect(error, `SSO callback error: ${error}`).toBeNull();
    expect(token).toBeTruthy();

    const me = await page.request.get(
      '/api/openpeeps/core/v1/profiles/current',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(me.ok()).toBeTruthy();
    const profile = await me.json();
    expect(profile.handle).toBeTruthy();
  });

  test('login page shows the mock OIDC provider button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByTestId('auth-login-oidc-mock')).toBeVisible({
      timeout: 15_000,
    });
  });
});
