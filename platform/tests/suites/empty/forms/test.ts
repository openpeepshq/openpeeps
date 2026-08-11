import { expect, test, type Page } from '@playwright/test';
import { testIds } from '../testIds';
import {
  handleSuffix,
  loginViaUi,
  registerViaUi,
  signInAsUiUser,
  uniqueSuffix,
} from '../ui/fixtures';

const registerPassword = 'ui-test-password';

const fillRegisterFields = async (
  page: Page,
  options: { confirmPassword?: string; acceptPrivacy?: boolean } = {},
) => {
  const suffix = uniqueSuffix();
  const handle = `signup${handleSuffix().slice(-10)}`;
  await page.goto('/auth/register');
  await page.getByTestId(testIds.auth.registerHandle).fill(handle);
  await page.getByTestId(testIds.auth.registerName).fill(`Form ${suffix}`);
  await page
    .getByTestId(testIds.auth.registerEmail)
    .fill(`form-${suffix}@example.com`);
  await page.getByTestId(testIds.auth.registerPassword).fill(registerPassword);
  await page
    .getByTestId(testIds.auth.registerConfirmPassword)
    .fill(options.confirmPassword ?? registerPassword);
  if (options.acceptPrivacy !== false) {
    await page.getByTestId(testIds.auth.registerPrivacyCheckbox).check();
  }
};

test.describe('forms', () => {
  test('login submits and lands in the community feed', async ({ page }) => {
    await loginViaUi(page);
  });

  test('login shows an error toast for a bad password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId(testIds.auth.loginEmail).fill('test@test.com');
    await page.getByTestId(testIds.auth.loginPassword).fill('wrongpass');
    await page.getByTestId(testIds.auth.loginSubmit).click();
    await expect(page.getByTestId(testIds.auth.loginError)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('register rejects mismatched passwords', async ({ page }) => {
    await fillRegisterFields(page, { confirmPassword: 'other-password' });
    await page.getByTestId(testIds.auth.registerSubmit).click();
    await expect(
      page.getByTestId(testIds.auth.registerConfirmPasswordError),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('register requires the privacy policy checkbox', async ({ page }) => {
    await fillRegisterFields(page, { acceptPrivacy: false });
    await page.getByTestId(testIds.auth.registerSubmit).click();
    await expect(
      page.getByTestId(testIds.auth.registerPrivacyError),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('register submits a valid signup', async ({ page }) => {
    await registerViaUi(page);
  });

  test('request password reset shows a success toast', async ({ page }) => {
    await page.goto('/auth/request-reset-password');
    await expect(
      page.getByTestId(testIds.auth.requestResetHeading),
    ).toBeVisible();
    await page
      .getByTestId(testIds.auth.requestResetEmail)
      .fill('test@test.com');
    await page.getByTestId(testIds.auth.requestResetSubmit).click();
    await expect(
      page.getByTestId(testIds.auth.requestResetSuccess),
    ).toBeVisible();
  });

  test('community info form saves a tagline', async ({ page, request }) => {
    await signInAsUiUser(page, request);
    await page.goto('/admin/configuration/community/info');
    const tagline = page.getByTestId(testIds.admin.communityInfoTagline);
    await expect(tagline).toBeVisible();
    const original = await tagline.inputValue();
    const next = `Tagline ${uniqueSuffix()}`;
    await tagline.fill(next);
    await page.getByTestId(testIds.admin.communityInfoSave).click();
    await expect(
      page.getByTestId(testIds.admin.communityInfoToast),
    ).toContainText('Community settings updated');
    await page.reload();
    await expect(tagline).toHaveValue(next);
    await tagline.fill(original);
    await page.getByTestId(testIds.admin.communityInfoSave).click();
    await expect(
      page.getByTestId(testIds.admin.communityInfoToast),
    ).toBeVisible();
  });

  test('community links form saves a privacy URL', async ({
    page,
    request,
  }) => {
    await signInAsUiUser(page, request);
    await page.goto('/admin/configuration/community/links');
    const privacy = page.getByTestId(testIds.admin.communityLinksPrivacy);
    await expect(privacy).toBeVisible();
    const original = await privacy.inputValue();
    const next = `https://example.com/privacy-${uniqueSuffix()}`;
    await privacy.fill(next);
    await page.getByTestId(testIds.admin.communityLinksSave).click();
    await expect(
      page.getByTestId(testIds.admin.communityLinksToast),
    ).toContainText('Community settings updated');
    await page.reload();
    await expect(privacy).toHaveValue(next);
    await privacy.fill(original);
    await page.getByTestId(testIds.admin.communityLinksSave).click();
    await expect(
      page.getByTestId(testIds.admin.communityLinksToast),
    ).toBeVisible();
  });

  test('email config form enables submit when dirty and does not persist', async ({
    page,
    request,
  }) => {
    await signInAsUiUser(page, request);
    await page.goto('/admin/configuration/email');
    const host = page.getByTestId(testIds.admin.emailHost);
    const submit = page.getByTestId(testIds.admin.emailSubmit);
    await expect(host).toBeVisible();
    await expect(page.getByTestId(testIds.admin.emailPort)).toBeVisible();
    await expect(
      page.getByTestId(testIds.admin.emailTestRecipient),
    ).toBeVisible();
    await expect(page.getByTestId(testIds.admin.emailSendTest)).toBeVisible();
    await expect(submit).toBeDisabled();
    const original = await host.inputValue();
    await host.fill(`${original || 'mailpit'}-changed`);
    await expect(submit).toBeEnabled();
    await host.fill(original);
    await expect(submit).toBeDisabled();
  });
});
