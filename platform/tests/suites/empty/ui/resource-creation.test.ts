import { expect, test, type Page } from '@playwright/test';
import { loginUser, uniqueHandle } from '../../../helpers/api';
import { testIds } from '../testIds';
import { credentialsStorageKey } from './fixtures';

const ownerLogin = {
  email: 'test@test.com',
  password: 'testtest',
};

type CreatedResource = {
  id: string;
  visibility: string;
  data: { type?: string; title?: string; resourceKind?: string };
};

const signIn = async (page: Page, token: string) => {
  await page.goto('/auth/login');
  await page.evaluate(
    ([key, authToken]) => {
      window.localStorage.setItem(key, JSON.stringify({ token: authToken }));
    },
    [credentialsStorageKey, token] as const,
  );
  await page.goto('/feeds/local');
  await expect(page.getByTestId(testIds.feeds.communityHeading)).toBeVisible();
};

const openFreshResourceForm = async (page: Page) => {
  await page.evaluate(() =>
    window.localStorage.removeItem('new-resource-state'),
  );
  await page.goto('/resources/new');
  await expect(page.getByTestId(testIds.resources.titleInput)).toBeVisible();
};

const publishResource = async (page: Page, title: string, url: string) => {
  await page.getByTestId(testIds.resources.titleInput).fill(title);
  await page.getByTestId(testIds.resources.urlInput).fill(url);
  const submit = page.getByTestId(testIds.resources.createSubmit);
  await expect(submit).toBeEnabled();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts\/?$/.test(new URL(response.url()).pathname),
  );
  await submit.click();
  const response = await responsePromise;
  const body = await response.text();
  expect(
    response.ok(),
    `create resource failed: ${response.status()} ${body}`,
  ).toBe(true);
  const created = JSON.parse(body) as CreatedResource;
  expect(created.data.title).toBe(title);
  await expect(page).toHaveURL(new RegExp(`/posts/${created.id}$`));
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  return created;
};

test.describe('creating resources', () => {
  test('a community resource appears in the library, and a bookmark shows on bookmarks', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const title = `Library link ${uniqueHandle('rs')}`;
    const url = `https://example.com/${uniqueHandle('u')}`;

    await signIn(page, owner.token);
    await openFreshResourceForm(page);
    const created = await publishResource(page, title, url);
    expect(created.data.type).toBe('resource');
    expect(created.data.resourceKind).toBe('link');

    const libraryLoaded = page.waitForResponse(
      (response) =>
        response.url().includes('/posts/by-type/resource') && response.ok(),
    );
    await page.goto('/resources');
    await libraryLoaded;
    await expect(page.getByTestId(testIds.resources.pageHeading)).toBeVisible();
    await expect(page.getByText(title).first()).toBeVisible();

    await page.goto(`/posts/${created.id}`);
    await page.getByTitle('Post menu').click();
    const bookmark = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes(`/posts/${created.id}/bookmark`),
    );
    await page.getByRole('button', { name: 'Add Bookmark' }).click();
    await bookmark;

    const bookmarksLoaded = page.waitForResponse(
      (response) =>
        response.url().includes('/posts/bookmarks') && response.ok(),
    );
    await page.goto('/feeds/bookmarks');
    await bookmarksLoaded;
    await expect(page.getByText(title).first()).toBeVisible();
  });
});
