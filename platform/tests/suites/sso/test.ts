import { expect, test } from '@playwright/test';
import { getServerInfo } from '../../helpers/api';

test.describe('OIDC SSO', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('server advertises the mock OIDC provider', async ({ request }) => {
    const info = await getServerInfo(request);
    const providers = info.sso?.oidc ?? [];
    expect(
      providers.some((provider: { id: string }) => provider.id === 'mock'),
    ).toBe(true);
  });

  test('login page shows the mock OIDC provider button', async ({
    page,
    request,
  }) => {
    const info = await getServerInfo(request);
    expect(
      info.sso?.oidc?.some(
        (provider: { id: string }) => provider.id === 'mock',
      ),
      `OIDC mock missing from /server/info: ${JSON.stringify(info.sso)}`,
    ).toBe(true);

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const capabilities = await request.get(
      '/api/openpeeps/core/v1/server/config/capabilities',
    );
    const capabilitiesDump = {
      status: capabilities.status(),
      body: (await capabilities.text()).slice(0, 400),
    };

    await page.goto('/auth/login');
    await page
      .getByTestId('auth-login-title')
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => undefined);
    const snapshot = {
      url: page.url(),
      titleCount: await page.getByTestId('auth-login-title').count(),
      buttonCount: await page.getByTestId('auth-login-oidc-mock').count(),
      redirectCount: await page.getByTestId('auth-login-sso-redirect').count(),
      html: (await page.content()).slice(0, 2500),
      pageErrors,
      consoleErrors,
      sso: info.sso,
      capabilitiesDump,
    };
    // #region agent log
    await fetch(
      'http://127.0.0.1:7499/ingest/27c2d08d-4470-4015-abd2-33d1e0e3ecd8',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'a0a46a',
        },
        body: JSON.stringify({
          sessionId: 'a0a46a',
          hypothesisId: 'E',
          location: 'suites/sso/test.ts:login',
          message: 'login page snapshot',
          data: snapshot,
          timestamp: Date.now(),
        }),
      },
    ).catch(() => undefined);
    // #endregion
    expect(
      snapshot.titleCount,
      `login title missing. url=${snapshot.url} redirect=${snapshot.redirectCount} cap=${JSON.stringify(capabilitiesDump)} pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} html=${snapshot.html}`,
    ).toBeGreaterThan(0);
    await expect(page.getByTestId('auth-login-title')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByTestId('auth-login-oidc-mock')).toBeVisible();
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
});
