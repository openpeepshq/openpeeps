import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginUser, uniqueHandle } from '../../../helpers/api';
import { testIds } from '../testIds';
import { credentialsStorageKey } from './fixtures';

const ownerLogin = {
  email: 'test@test.com',
  password: 'testtest',
};

const fixture = (name: string): string =>
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);

// The hidden image/video file input used by the resource form's Add files button.
const IMAGE_INPUT = 'input[type="file"][accept="image/*,video/*,.mkv"]';
// The hidden audio file input used by the resource form's Add files button.
const AUDIO_INPUT = 'input[type="file"][accept^="audio/*"]';

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

const addImage = async (page: Page, file: string, alt: string) => {
  await page.locator(IMAGE_INPUT).setInputFiles(file);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Alt text').fill(alt);
  await dialog.getByRole('button', { name: 'Add' }).click();
  await expect(dialog).toBeHidden();
};

// Card previews render the attachment description as the image alt, so the
// alt order is the attachment order.
const cardAlts = async (page: Page, alts: string[]): Promise<string[]> =>
  page
    .locator('img')
    .evaluateAll(
      (imgs, wanted) =>
        imgs.map((img) => img.alt).filter((alt) => wanted.includes(alt)),
      alts,
    );

type CreatedGallery = {
  id: string;
  data: {
    type?: string;
    title?: string;
    attachments?: { description?: string }[];
  };
};

const submitGallery = async (page: Page, title: string) => {
  await page.getByTestId(testIds.resources.titleInput).fill(title);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/posts\/?$/.test(new URL(response.url()).pathname),
  );
  await page.getByTestId(testIds.resources.createSubmit).click();
  const response = await responsePromise;
  const body = await response.text();
  expect(
    response.ok(),
    `create gallery failed: ${response.status()} ${body}`,
  ).toBe(true);
  return JSON.parse(body) as CreatedGallery;
};

test.describe('creating gallery resources', () => {
  test('one file per pick stores the images in the order they were added', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const title = `Gallery order ${uniqueHandle('go')}`;

    await signIn(page, owner.token);
    await openFreshResourceForm(page);
    await page.getByTestId('resources-kind-gallery').click();

    // The pencil (Edit description) only appears once an attachment is ready.
    const readyCards = page.getByTitle('Edit description');
    await addImage(page, fixture('red-64.png'), 'red image');
    await expect(readyCards).toHaveCount(1);
    await addImage(page, fixture('blue-64.png'), 'blue image');
    await expect(readyCards).toHaveCount(2);

    // The composer shows the cards in the order the images were added.
    expect(await cardAlts(page, ['red image', 'blue image'])).toEqual([
      'red image',
      'blue image',
    ]);

    const created = await submitGallery(page, title);
    expect(created.data.attachments?.map((a) => a.description)).toEqual([
      'red image',
      'blue image',
    ]);
  });

  test('a bulk pick stores the images in the order they were picked', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );
    const title = `Gallery bulk ${uniqueHandle('gb')}`;

    await signIn(page, owner.token);
    await openFreshResourceForm(page);
    await page.getByTestId('resources-kind-gallery').click();

    // Only the gallery kind allows a multi-file pick, and a bulk pick skips
    // the per-image crop dialog, so no dialog may appear here.
    const imageInput = page.locator(IMAGE_INPUT);
    await expect(imageInput).toHaveAttribute('multiple', '');
    await imageInput.setInputFiles([
      fixture('red-64.png'),
      fixture('blue-64.png'),
    ]);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Bulk picks carry no alt text, so the descriptions are the file names.
    const readyCards = page.getByTitle('Edit description');
    await expect(readyCards).toHaveCount(2);
    expect(await cardAlts(page, ['red-64.png', 'blue-64.png'])).toEqual([
      'red-64.png',
      'blue-64.png',
    ]);

    const created = await submitGallery(page, title);
    expect(created.data.attachments?.map((a) => a.description)).toEqual([
      'red-64.png',
      'blue-64.png',
    ]);
  });

  test('non-gallery resource kinds keep the single-file pick', async ({
    page,
    request,
  }) => {
    const owner = await loginUser(
      request,
      ownerLogin.email,
      ownerLogin.password,
    );

    await signIn(page, owner.token);
    await openFreshResourceForm(page);
    await page.getByTestId('resources-kind-video').click();
    await expect(page.locator(IMAGE_INPUT)).not.toHaveAttribute('multiple');
    await expect(page.locator(AUDIO_INPUT)).not.toHaveAttribute('multiple');
  });
});
