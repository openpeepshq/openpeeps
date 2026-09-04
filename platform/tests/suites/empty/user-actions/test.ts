import { expect, test } from '@playwright/test';
import {
  createEvent,
  createGroup,
  createNote,
  currentProfile,
  loginUser,
  registerUser,
  requestPasswordReset,
  requestValidationEmail,
  resetPassword,
  uniqueHandle,
  validateEmailToken,
  apiHeaders,
} from '../../../helpers/api';
import {
  clearMailpit,
  extractFromMailpitMessage,
  waitForMailpitMessage,
} from '../../../helpers/mailpit';

const owner = {
  email: 'test@test.com',
  password: 'testtest',
};

/** Closed-community group caps: local profiles can join/read. */
const memberCaps = {
  local: {
    add: [
      'core-groups-read',
      'core-posts-read',
      'core-groups-join',
      'core-posts-react',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
  },
  member: {
    add: [
      'core-posts-create-*',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
    remove: ['core-posts-create-event'],
  },
  moderator: { add: ['core-posts-*'] },
  admin: {
    add: [
      'core-posts-*',
      'core-groups-read',
      'core-groups-update',
      'core-groups-join',
      'core-groups-leave',
      'core-groups-addMember',
      'core-groups-removeMember',
      'core-groups-changeMemberRole',
    ],
  },
  owner: { add: ['core-posts-*', 'core-groups-*'] },
};

const promoteToMemberViaEmail = async (
  request: Parameters<typeof registerUser>[0],
  token: string,
  email: string,
) => {
  await clearMailpit();
  await requestValidationEmail(request, token);
  const mail = await waitForMailpitMessage(
    (message) =>
      message.To.some((to) => to.Address === email) &&
      /validate your email/i.test(message.Subject),
    { timeoutMs: 45_000 },
  );
  const validationToken = await extractFromMailpitMessage(
    mail.ID,
    /[?&]token=([^&"'>\s]+)/i,
  );
  const result = await validateEmailToken(request, validationToken);
  expect(result.success).toBe(true);
};

test.describe('user actions (API)', () => {
  test('login returns a usable session', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    expect(token).toBeTruthy();
    const profile = await currentProfile(request, token);
    expect(profile.handle).toBe('test');
  });

  test('UI login form reaches the local feed', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('auth-login-email').fill(owner.email);
    await page.getByTestId('auth-login-password').fill(owner.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/(feeds\/local|welcome|payment)/, {
      timeout: 30_000,
    });
  });

  test('password reset via Mailpit updates credentials', async ({
    request,
  }) => {
    const handle = uniqueHandle('pw');
    const email = `${handle}@openpeeps.test`;
    const password = 'oldpassword1';
    const nextPassword = 'newpassword1';
    await registerUser(request, { handle, email, password });

    await clearMailpit();
    await requestPasswordReset(request, email);
    const mail = await waitForMailpitMessage(
      (message) =>
        message.To.some((to) => to.Address === email) &&
        /reset your password/i.test(message.Subject),
      { timeoutMs: 45_000 },
    );
    const resetToken = await extractFromMailpitMessage(
      mail.ID,
      /#token=([^&"'>\s]+)/i,
    );
    await resetPassword(request, resetToken, nextPassword);

    const loggedIn = await loginUser(request, email, nextPassword);
    expect(loggedIn.token).toBeTruthy();
  });

  test('email validation promotes a pending member', async ({ request }) => {
    const handle = uniqueHandle('em');
    const email = `${handle}@openpeeps.test`;
    const { token } = await registerUser(request, {
      handle,
      email,
      password: 'testtest12',
    });
    await promoteToMemberViaEmail(request, token, email);

    // Member can create posts after validation.
    const note = await createNote(
      request,
      token,
      `Validated member post ${handle}`,
    );
    expect(note.id).toBeTruthy();
  });

  test('reply, react, bookmark, and edit/delete a note', async ({
    request,
  }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const note = await createNote(
      request,
      token,
      `Parent note ${uniqueHandle('n')}`,
    );

    const reply = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(token),
      data: {
        type: 'note',
        visibility: 'local',
        inReplyToId: note.id,
        data: { type: 'note', content: `Reply ${uniqueHandle('r')}` },
      },
    });
    expect(reply.ok(), await reply.text()).toBeTruthy();
    const replyPost = (await reply.json()) as { id: string };

    const feed = await request.get('/api/openpeeps/core/v1/posts/feeds/local', {
      headers: apiHeaders(token),
    });
    expect(feed.ok(), await feed.text()).toBeTruthy();
    const feedPosts = (await feed.json()) as Array<{ id: string }>;
    expect(feedPosts.some((post) => post.id === note.id)).toBe(true);
    expect(feedPosts.some((post) => post.id === replyPost.id)).toBe(false);

    const replies = await request.get(
      `/api/openpeeps/core/v1/posts/${note.id}/replies`,
      { headers: apiHeaders(token) },
    );
    expect(replies.ok()).toBeTruthy();
    const replyList = await replies.json();
    expect(Array.isArray(replyList) ? replyList.length : 0).toBeGreaterThan(0);

    const react = await request.post(
      `/api/openpeeps/core/v1/posts/${note.id}/react`,
      {
        headers: apiHeaders(token),
        data: { reaction: '👍' },
      },
    );
    expect(react.ok(), await react.text()).toBeTruthy();

    const unreact = await request.delete(
      `/api/openpeeps/core/v1/posts/${note.id}/react`,
      { headers: apiHeaders(token) },
    );
    expect(unreact.ok(), await unreact.text()).toBeTruthy();

    const bookmark = await request.post(
      `/api/openpeeps/core/v1/posts/${note.id}/bookmark`,
      { headers: apiHeaders(token), data: {} },
    );
    expect(bookmark.ok(), await bookmark.text()).toBeTruthy();

    const bookmarks = await request.get(
      '/api/openpeeps/core/v1/posts/bookmarks',
      { headers: apiHeaders(token) },
    );
    expect(bookmarks.ok()).toBeTruthy();
    const bookmarked = await bookmarks.json();
    expect(
      (bookmarked as Array<{ id: string }>).some((post) => post.id === note.id),
    ).toBe(true);

    const updatedContent = `Edited ${uniqueHandle('e')}`;
    const edit = await request.put(`/api/openpeeps/core/v1/posts/${note.id}`, {
      headers: apiHeaders(token),
      data: { type: 'note', content: updatedContent },
    });
    expect(edit.ok(), await edit.text()).toBeTruthy();

    const del = await request.delete(
      `/api/openpeeps/core/v1/posts/${note.id}`,
      { headers: apiHeaders(token) },
    );
    expect(del.ok(), await del.text()).toBeTruthy();
  });

  test('reply activity bumps the original and latestReplies stay direct', async ({
    request,
  }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    type FeedPost = {
      id: string;
      createdAt: string;
      lastActivityAt?: string;
      latestReplies?: { id: string }[];
      replyCount?: number;
    };

    const older = (await createNote(
      request,
      token,
      `Older note ${uniqueHandle('o')}`,
    )) as FeedPost;
    const newer = (await createNote(
      request,
      token,
      `Newer note ${uniqueHandle('n')}`,
    )) as FeedPost;
    const createdAt = older.createdAt;

    const reply = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(token),
      data: {
        type: 'note',
        visibility: 'local',
        inReplyToId: older.id,
        data: { type: 'note', content: `Direct ${uniqueHandle('d')}` },
      },
    });
    expect(reply.ok(), await reply.text()).toBeTruthy();
    const directReply = (await reply.json()) as { id: string };

    const nested = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(token),
      data: {
        type: 'note',
        visibility: 'local',
        inReplyToId: directReply.id,
        data: { type: 'note', content: `Nested ${uniqueHandle('x')}` },
      },
    });
    expect(nested.ok(), await nested.text()).toBeTruthy();
    const nestedReply = (await nested.json()) as { id: string };

    const feed = await request.get('/api/openpeeps/core/v1/posts/feeds/local', {
      headers: apiHeaders(token),
    });
    expect(feed.ok(), await feed.text()).toBeTruthy();
    const feedPosts = (await feed.json()) as FeedPost[];
    const olderIdx = feedPosts.findIndex((post) => post.id === older.id);
    const newerIdx = feedPosts.findIndex((post) => post.id === newer.id);
    expect(olderIdx).toBeGreaterThanOrEqual(0);
    expect(newerIdx).toBeGreaterThanOrEqual(0);
    expect(olderIdx).toBeLessThan(newerIdx);
    expect(feedPosts.some((post) => post.id === directReply.id)).toBe(false);
    expect(feedPosts.some((post) => post.id === nestedReply.id)).toBe(false);

    const bumped = feedPosts[olderIdx]!;
    expect(bumped.createdAt).toBe(createdAt);
    expect(bumped.latestReplies?.map((item) => item.id)).toContain(
      directReply.id,
    );
    expect(bumped.latestReplies?.map((item) => item.id)).not.toContain(
      nestedReply.id,
    );

    const myFeed = await request.get('/api/openpeeps/core/v1/posts/feeds/my', {
      headers: apiHeaders(token),
    });
    expect(myFeed.ok(), await myFeed.text()).toBeTruthy();
    const myPosts = (await myFeed.json()) as FeedPost[];
    expect(myPosts.findIndex((post) => post.id === older.id)).toBeLessThan(
      myPosts.findIndex((post) => post.id === newer.id),
    );

    const page1 = await request.get(
      '/api/openpeeps/core/v1/posts/feeds/local?limit=1',
      { headers: apiHeaders(token) },
    );
    expect(page1.ok(), await page1.text()).toBeTruthy();
    const firstPage = (await page1.json()) as FeedPost[];
    expect(firstPage).toHaveLength(1);
    const cursorPost = firstPage[0]!;
    const start = cursorPost.lastActivityAt
      ? `${cursorPost.lastActivityAt}|${cursorPost.id}`
      : cursorPost.id;
    const page2 = await request.get(
      `/api/openpeeps/core/v1/posts/feeds/local?limit=1&start=${encodeURIComponent(start)}`,
      { headers: apiHeaders(token) },
    );
    expect(page2.ok(), await page2.text()).toBeTruthy();
    const secondPage = (await page2.json()) as FeedPost[];
    expect(secondPage[0]?.id).not.toBe(cursorPost.id);

    const beforeReact = bumped.lastActivityAt;
    const react = await request.post(
      `/api/openpeeps/core/v1/posts/${older.id}/react`,
      {
        headers: apiHeaders(token),
        data: { reaction: '👍' },
      },
    );
    expect(react.ok(), await react.text()).toBeTruthy();
    const afterReactFeed = await request.get(
      '/api/openpeeps/core/v1/posts/feeds/local?limit=1',
      { headers: apiHeaders(token) },
    );
    const afterReact = ((await afterReactFeed.json()) as FeedPost[])[0];
    expect(afterReact?.id).toBe(older.id);
    expect(afterReact?.createdAt).toBe(createdAt);
    if (beforeReact && afterReact?.lastActivityAt) {
      expect(afterReact.lastActivityAt >= beforeReact).toBe(true);
    }
  });

  test('follow and unfollow another profile', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const handle = uniqueHandle('fl');
    const email = `${handle}@openpeeps.test`;
    const { token: memberToken } = await registerUser(request, {
      handle,
      email,
      password: 'testtest12',
    });
    await promoteToMemberViaEmail(request, memberToken, email);
    const ownerProfile = await currentProfile(request, ownerToken);
    const memberProfile = await currentProfile(request, memberToken);

    const follow = await request.post(
      `/api/openpeeps/core/v1/profiles/${ownerProfile.id}/follow`,
      {
        headers: apiHeaders(memberToken),
        data: {},
      },
    );
    expect(follow.ok(), await follow.text()).toBeTruthy();

    const followers = await request.get(
      `/api/openpeeps/core/v1/profiles/${ownerProfile.id}/followers`,
      { headers: apiHeaders(ownerToken) },
    );
    expect(followers.ok()).toBeTruthy();
    const followerList = await followers.json();
    expect(
      (followerList as Array<{ id?: string; profile?: { id: string } }>).some(
        (entry) =>
          entry.id === memberProfile.id ||
          entry.profile?.id === memberProfile.id,
      ),
    ).toBe(true);

    const unfollow = await request.delete(
      `/api/openpeeps/core/v1/profiles/${ownerProfile.id}/follow`,
      { headers: apiHeaders(memberToken) },
    );
    expect(unfollow.ok(), await unfollow.text()).toBeTruthy();
  });

  test('group join, members list, and leave', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const handle = uniqueHandle('gj');
    const group = await createGroup(request, ownerToken, {
      handle,
      displayName: `Join ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });

    const memberHandle = uniqueHandle('gm');
    const memberEmail = `${memberHandle}@openpeeps.test`;
    const { token: memberToken } = await registerUser(request, {
      handle: memberHandle,
      email: memberEmail,
      password: 'testtest12',
    });
    await promoteToMemberViaEmail(request, memberToken, memberEmail);
    const memberProfile = await currentProfile(request, memberToken);

    const join = await request.post(
      `/api/openpeeps/core/v1/groups/${group.id}/join`,
      { headers: apiHeaders(memberToken), data: {} },
    );
    expect(join.ok(), await join.text()).toBeTruthy();

    const members = await request.get(
      `/api/openpeeps/core/v1/groups/${group.id}/members`,
      { headers: apiHeaders(ownerToken) },
    );
    expect(members.ok(), await members.text()).toBeTruthy();
    const memberList = await members.json();
    expect(
      (memberList as Array<{ profile?: { id: string }; id?: string }>).some(
        (entry) =>
          entry.profile?.id === memberProfile.id ||
          entry.id === memberProfile.id,
      ),
    ).toBe(true);

    const leave = await request.delete(
      `/api/openpeeps/core/v1/groups/${group.id}/leave`,
      { headers: apiHeaders(memberToken) },
    );
    expect(leave.ok(), await leave.text()).toBeTruthy();
  });

  test('event upcoming feed and RSVP', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const event = await createEvent(
      request,
      token,
      `RSVP Event ${uniqueHandle('ev')}`,
    );

    const upcoming = await request.get(
      '/api/openpeeps/core/v1/posts/feeds/events/upcoming',
      { headers: apiHeaders(token) },
    );
    expect(upcoming.ok(), await upcoming.text()).toBeTruthy();
    const list = await upcoming.json();
    expect(
      (list as Array<{ id: string }>).some((post) => post.id === event.id),
    ).toBe(true);

    const rsvp = await request.post(
      `/api/openpeeps/core/v1/posts/${event.id}/rsvp`,
      {
        headers: apiHeaders(token),
        data: { response: 'yes' },
      },
    );
    expect(rsvp.ok(), await rsvp.text()).toBeTruthy();
  });

  test('upcoming feed returns one row per recurring event', async ({
    request,
  }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const soon = Date.now() + 60_000;
    const recurring = await createEvent(
      request,
      token,
      `Daily Series ${uniqueHandle('daily')}`,
      {
        start: new Date(soon).toISOString(),
        end: new Date(soon + 3_600_000).toISOString(),
        recurrence: { freq: 'DAILY' },
      },
    );
    const later = await createEvent(
      request,
      token,
      `Later One-off ${uniqueHandle('later')}`,
      {
        start: new Date(soon + 20 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(
          soon + 20 * 24 * 60 * 60 * 1000 + 3_600_000,
        ).toISOString(),
      },
    );

    const upcoming = await request.get(
      '/api/openpeeps/core/v1/posts/feeds/events/upcoming?limit=15',
      { headers: apiHeaders(token) },
    );
    expect(upcoming.ok(), await upcoming.text()).toBeTruthy();
    const list = (await upcoming.json()) as Array<{ id: string }>;
    expect(list.filter((post) => post.id === recurring.id)).toHaveLength(1);
    expect(list.some((post) => post.id === later.id)).toBe(true);
  });

  test('direct message create and reply', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const ownerProfile = await currentProfile(request, ownerToken);

    const handle = uniqueHandle('dm');
    const email = `${handle}@openpeeps.test`;
    const { token: memberToken } = await registerUser(request, {
      handle,
      email,
      password: 'testtest12',
    });
    await promoteToMemberViaEmail(request, memberToken, email);
    const memberProfile = await currentProfile(request, memberToken);

    // Audience must include full public profile shapes the API accepts.
    const ownerPublic = await request.get(
      `/api/openpeeps/core/v1/profiles/${ownerProfile.id}`,
      { headers: apiHeaders(ownerToken) },
    );
    const memberPublic = await request.get(
      `/api/openpeeps/core/v1/profiles/${memberProfile.id}`,
      { headers: apiHeaders(memberToken) },
    );
    expect(ownerPublic.ok() && memberPublic.ok()).toBeTruthy();
    const ownerBody = await ownerPublic.json();
    const memberBody = await memberPublic.json();

    const dm = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(ownerToken),
      data: {
        type: 'note',
        visibility: 'direct',
        audience: [ownerBody, memberBody],
        data: { type: 'note', content: `Hello DM ${handle}` },
      },
    });
    expect(dm.ok(), await dm.text()).toBeTruthy();
    const conversation = await dm.json();

    const reply = await request.post(
      `/api/openpeeps/core/v1/conversations/${conversation.id}/posts`,
      {
        headers: apiHeaders(memberToken),
        data: {
          type: 'note',
          visibility: 'direct',
          audience: [ownerBody, memberBody],
          data: { type: 'note', content: `Reply DM ${handle}` },
        },
      },
    );
    expect(reply.ok(), await reply.text()).toBeTruthy();

    const conversations = await request.get(
      '/api/openpeeps/core/v1/conversations',
      { headers: apiHeaders(ownerToken) },
    );
    expect(conversations.ok()).toBeTruthy();
  });

  test('follow creates a notification for the target', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const ownerProfile = await currentProfile(request, ownerToken);

    const handle = uniqueHandle('nf');
    const email = `${handle}@openpeeps.test`;
    const { token: memberToken } = await registerUser(request, {
      handle,
      email,
      password: 'testtest12',
    });
    await promoteToMemberViaEmail(request, memberToken, email);

    await request.post(
      `/api/openpeeps/core/v1/profiles/${ownerProfile.id}/follow`,
      {
        headers: apiHeaders(memberToken),
        data: {},
      },
    );

    await expect
      .poll(
        async () => {
          const response = await request.get(
            '/api/openpeeps/core/v1/profiles/current/notifications',
            { headers: apiHeaders(ownerToken) },
          );
          if (!response.ok()) return 0;
          const notifications = await response.json();
          return Array.isArray(notifications) ? notifications.length : 0;
        },
        { timeout: 45_000, intervals: [500, 1000, 2000] },
      )
      .toBeGreaterThan(0);
  });

  test('invite link create and redeem on register', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const slug = uniqueHandle('inv');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3_600_000).toISOString();
    const create = await request.post('/api/openpeeps/core/v1/invite-links', {
      headers: apiHeaders(ownerToken),
      data: {
        slug,
        active: true,
        maxUses: 10,
        expiresAt,
      },
    });
    expect(create.ok(), await create.text()).toBeTruthy();

    const handle = uniqueHandle('ir');
    const registered = await registerUser(request, {
      handle,
      email: `${handle}@openpeeps.test`,
      password: 'testtest12',
      inviteCode: slug,
    });
    expect(registered.token).toBeTruthy();
  });

  test('report create and admin resolve', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const handle = uniqueHandle('rp');
    const email = `${handle}@openpeeps.test`;
    const { token: memberToken } = await registerUser(request, {
      handle,
      email,
      password: 'testtest12',
    });
    await promoteToMemberViaEmail(request, memberToken, email);
    const memberProfile = await currentProfile(request, memberToken);
    const note = await createNote(request, memberToken, `Reportable ${handle}`);

    const report = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(ownerToken),
      data: {
        profileId: memberProfile.id,
        postIds: [note.id],
        report: {
          comment: 'spam for integration test',
          category: 'spam',
        },
      },
    });
    expect(report.ok(), await report.text()).toBeTruthy();
    const created = await report.json();
    expect(
      created.id,
      `report create returned no id: ${JSON.stringify(created)}`,
    ).toBeTruthy();

    const resolve = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/resolve`,
      {
        headers: apiHeaders(ownerToken),
        data: { resolution: 'ignore' },
      },
    );
    expect(resolve.ok(), await resolve.text()).toBeTruthy();
  });
});
