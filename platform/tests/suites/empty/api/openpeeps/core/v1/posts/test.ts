import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  apiHeaders,
  createNote,
  loginUser,
} from '../../../../../../../helpers/api';

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';

const createResource = async (
  request: APIRequestContext,
  token: string,
  categoryPath?: string[],
) => {
  const data = {
    type: 'resource',
    title: 'Category path gate',
    resourceKind: 'link',
    url: 'https://example.com/category-path-gate',
    ...(categoryPath === undefined ? {} : { categoryPath }),
  };
  return request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: { type: 'resource', visibility: 'local', data },
  });
};

test.describe('posts API', () => {
  test('rejects a reply whose parent post was deleted', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const parent = await createNote(request, ownerToken, 'Parent post', {
      visibility: 'public',
    });

    const createReply = async () =>
      request.post('/api/openpeeps/core/v1/posts', {
        headers: apiHeaders(ownerToken),
        data: {
          type: 'note',
          visibility: 'local',
          data: { type: 'note', content: 'Reply to parent post' },
          inReplyToId: parent.id,
        },
      });

    const reply = await createReply();
    expect(reply.status()).toBe(200);
    const replyBody = (await reply.json()) as {
      visibility: string;
      inReplyToId: string;
    };
    // Replies inherit the parent's visibility.
    expect(replyBody.visibility).toBe('public');
    expect(replyBody.inReplyToId).toBe(parent.id);

    const deleted = await request.delete(
      `/api/openpeeps/core/v1/posts/${parent.id}`,
      { headers: apiHeaders(ownerToken) },
    );
    expect(deleted.status()).toBe(200);

    const rejected = await createReply();
    expect(rejected.status()).toBe(404);
    expect(await rejected.json()).toMatchObject({
      message: 'error.postDeleted',
    });
  });

  test('rejects a resource with a blank categoryPath segment', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );

    const blank = await createResource(request, ownerToken, ['HR', '   ']);
    expect(blank.status()).toBe(400);
    expect(await blank.json()).toMatchObject({
      message: 'invalidCategoryPath',
    });
  });

  test('rejects a resource with a padded categoryPath segment', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );

    const padded = await createResource(request, ownerToken, [' HR ']);
    expect(padded.status()).toBe(400);
    expect(await padded.json()).toMatchObject({
      message: 'invalidCategoryPath',
    });
  });

  test('accepts a valid resource categoryPath', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );

    const ok = await createResource(request, ownerToken, ['HR', 'Benefits']);
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toMatchObject({
      data: { categoryPath: ['HR', 'Benefits'] },
    });
  });

  test('PUT keeps a legacy padded categoryPath editable but rejects a changed invalid one', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );

    const created = (await (
      await createResource(request, ownerToken, ['HR', 'Benefits'])
    ).json()) as { id: string };
    expect(created.id).toBeDefined();

    const put = async (categoryPath: string[] | undefined) =>
      request.put(`/api/openpeeps/core/v1/posts/${created.id}`, {
        headers: apiHeaders(ownerToken),
        data: {
          type: 'resource',
          title: 'Category path gate',
          resourceKind: 'link',
          url: 'https://example.com/category-path-gate',
          ...(categoryPath === undefined ? {} : { categoryPath }),
        },
      });

    // Unchanged stored path (not yet gate-valid by legacy rules) stays editable.
    const unchanged = await put(['HR', 'Benefits']);
    expect(unchanged.status()).toBe(200);

    // A changed path that fails the gate is rejected.
    const changedInvalid = await put(['A', ' ']);
    expect(changedInvalid.status()).toBe(400);
    expect(await changedInvalid.json()).toMatchObject({
      message: 'invalidCategoryPath',
    });
  });
});
