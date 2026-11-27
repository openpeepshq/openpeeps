import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  createNote,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../../../../../../../helpers/api';

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';

// #382: a draft (published_at IS NULL) must be invisible to anyone who is not
// its creator. The unit tests pin the core `canReadPost`/capability logic;
// this pin runs the same guarantee end-to-end through the HTTP read paths the
// plan enumerates: the drafts list, the public feed, and the by-id route.
test.describe('posts drafts visibility (#382)', () => {
  test('a draft is invisible to a non-creator through every shared read path', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    // A second, unrelated user.
    const handle = uniqueHandle('draft');
    const { token: readerToken } = await registerUser(request, {
      handle,
      email: `${handle}@openpeeps.test`,
      password: 'testtest12',
    });

    // 1. Owner creates a draft note (public visibility, still unpublished).
    const draft = await createNote(request, ownerToken, 'A secret draft', {
      visibility: 'public',
      draft: true,
    });

    // 2. The owner sees exactly their own draft in GET /posts/drafts.
    const myDrafts = await request.get('/api/openpeeps/core/v1/posts/drafts', {
      headers: apiHeaders(ownerToken),
    });
    expect(myDrafts.status()).toBe(200);
    const myDraftsBody = (await myDrafts.json()) as { id: string }[];
    expect(myDraftsBody.map((p) => p.id)).toContain(draft.id);

    // 3. The reader's GET /posts/drafts does not include the owner's draft.
    const readerDrafts = await request.get(
      '/api/openpeeps/core/v1/posts/drafts',
      { headers: apiHeaders(readerToken) },
    );
    expect(readerDrafts.status()).toBe(200);
    const readerDraftsBody = (await readerDrafts.json()) as { id: string }[];
    expect(readerDraftsBody.some((p) => p.id === draft.id)).toBe(false);

    // 4. The reader's public feed (GET /posts) does not include the draft,
    //    even though its visibility is public — it is unpublished.
    const feed = await request.get('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(readerToken),
    });
    expect(feed.status()).toBe(200);
    const feedBody = (await feed.json()) as { id: string }[];
    expect(feedBody.some((p) => p.id === draft.id)).toBe(false);

    // 5. The reader's GET /posts/:id for the draft is a 403 at the capability
    //    gate (not a 200 leaking content, not a 404 hiding that the id exists).
    const direct = await request.get(
      `/api/openpeeps/core/v1/posts/${draft.id}`,
      { headers: apiHeaders(readerToken) },
    );
    expect(direct.status()).toBe(403);

    // 6. The owner still reads the draft by id (no self-visibility regression).
    const ownerDirect = await request.get(
      `/api/openpeeps/core/v1/posts/${draft.id}`,
      { headers: apiHeaders(ownerToken) },
    );
    expect(ownerDirect.status()).toBe(200);
    const ownerDirectBody = (await ownerDirect.json()) as {
      id: string;
      isDraft: boolean;
    };
    expect(ownerDirectBody.id).toBe(draft.id);
    expect(ownerDirectBody.isDraft).toBe(true);
  });

  test('the owner publishes a draft through the real endpoint; re-publish is rejected', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );

    // A fresh draft, so the re-publish below cannot collide with another case's post.
    const draft = await createNote(request, ownerToken, 'A draft to publish', {
      visibility: 'public',
      draft: true,
    });

    // 1. The owner publishes it: 200, and the returned post is no longer a draft.
    // No-payload POST, but `apiHeaders` sets a JSON content-type, so send an
    // empty JSON object (the suite convention for no-payload writes) rather
    // than a bare empty body, which the JSON parser rejects with 400.
    const publish = await request.post(
      `/api/openpeeps/core/v1/posts/${draft.id}/publish`,
      { headers: apiHeaders(ownerToken), data: {} },
    );
    expect(publish.status()).toBe(200);
    const publishedBody = (await publish.json()) as {
      id: string;
      isDraft?: boolean;
      publishedAt?: string | null;
    };
    expect(publishedBody.id).toBe(draft.id);
    expect(publishedBody.isDraft).toBeFalsy();
    expect(publishedBody.publishedAt).toBeTruthy();

    // 2. The published post is now visible in the reader's public feed — the
    //    real `publishPost` side effects ran (not a visibility-only flip).
    const readerHandle = uniqueHandle('feedreader');
    const { token: readerToken } = await registerUser(request, {
      handle: readerHandle,
      email: `${readerHandle}@openpeeps.test`,
      password: 'testtest12',
    });
    const feed = await request.get('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(readerToken),
    });
    expect(feed.status()).toBe(200);
    const feedBody = (await feed.json()) as { id: string }[];
    expect(feedBody.some((p) => p.id === draft.id)).toBe(true);

    // 3. Re-publishing the same post is a 422 (already published), not a 500.
    const republish = await request.post(
      `/api/openpeeps/core/v1/posts/${draft.id}/publish`,
      { headers: apiHeaders(ownerToken), data: {} },
    );
    expect(republish.status()).toBe(422);
    expect(await republish.json()).toMatchObject({
      message: 'error.alreadyPublished',
    });
  });
});
