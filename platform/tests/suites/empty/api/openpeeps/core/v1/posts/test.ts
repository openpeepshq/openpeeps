import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  createNote,
  loginUser,
} from '../../../../../../../helpers/api';

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';

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
});
