import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  addGroupMember,
  announcePost,
  apiHeaders,
  clearMailpit,
  createEvent,
  createGroup,
  createNote,
  createWebhookPushSubscription,
  currentProfile,
  enableEmailNotifications,
  getPublicProfile,
  loginUser,
  queueTestEmail,
  registerUser,
  repostNote,
  requestPasswordReset,
  requestValidationEmail,
  sendTestPush,
  startPushCatcher,
  uniqueHandle,
  validateEmailToken,
  waitForMailpitMessage,
  waitForPush,
  extractFromMailpitMessage,
  getMailpitBody,
} from '../../../helpers';
import type { MailpitMessage } from '../../../helpers/mailpit';
import { testIds } from '../testIds';

const owner = {
  email: 'test@test.com',
  password: 'testtest',
  handle: 'test',
};

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

const mailTimeout = { timeoutMs: 60_000 };

const waitForMail = (to: string, subject: RegExp): Promise<MailpitMessage> =>
  waitForMailpitMessage(
    (mail) =>
      mail.To.some((recipient) => recipient.Address === to) &&
      subject.test(mail.Subject),
    mailTimeout,
  );

/**
 * Asserts the message has real body content (guards against empty post embeds /
 * theme-invisible renders that still produce a subject line).
 */
const expectMailContent = async (
  mail: MailpitMessage,
  snippets: Array<string | RegExp>,
) => {
  const { html, text, combined } = await getMailpitBody(mail.ID);
  expect(html.length + text.length, 'email body empty').toBeGreaterThan(80);
  // Post embeds use email Tailwind with concrete hex colors — unresolved CSS
  // variables are a common cause of "blank" looking notification emails.
  expect(html).not.toMatch(/color:\s*var\(--/i);
  for (const snippet of snippets) {
    if (typeof snippet === 'string') {
      expect(combined).toContain(snippet);
    } else {
      expect(combined).toMatch(snippet);
    }
  }
};

const promoteToMember = async (
  request: APIRequestContext,
  token: string,
  email: string,
) => {
  await clearMailpit();
  await requestValidationEmail(request, token);
  const mail = await waitForMail(email, /validate your email/i);
  const validationToken = await extractFromMailpitMessage(
    mail.ID,
    /[?&]token=([^&"'>\s]+)/i,
  );
  const result = await validateEmailToken(request, validationToken);
  expect(result.success).toBe(true);
};

const registerMember = async (
  request: APIRequestContext,
  { promote = true }: { promote?: boolean } = {},
) => {
  const handle = uniqueHandle('em');
  const email = `${handle}@openpeeps.test`;
  const { token } = await registerUser(request, {
    handle,
    email,
    password: 'testtest12',
  });
  if (promote) {
    await promoteToMember(request, token, email);
  }
  return { handle, email, token };
};

test.describe('email + push', () => {
  test('admin test email is delivered via Mailpit', async ({ request }) => {
    await clearMailpit();
    const { token } = await loginUser(request, owner.email, owner.password);
    const to = `mailpit+${Date.now()}@openpeeps.test`;

    await queueTestEmail(request, token, to);

    const message = await waitForMail(to, /test email/i);
    expect(message.Subject).toMatch(/test email/i);
    await expectMailContent(message, [/test email/i]);
  });

  test('register delivers welcome and validation emails', async ({
    request,
  }) => {
    await clearMailpit();
    const { email } = await registerMember(request, { promote: false });

    const welcome = await waitForMail(email, /welcome to/i);
    await expectMailContent(welcome, [/welcome/i]);
    const validate = await waitForMail(email, /validate your email/i);
    await expectMailContent(validate, [/[?&]token=/i]);
  });

  test('password reset email is delivered via Mailpit', async ({ request }) => {
    const { email } = await registerMember(request);
    await clearMailpit();
    await requestPasswordReset(request, email);
    const mail = await waitForMail(email, /reset your password/i);
    await expectMailContent(mail, [/[?&]|#.*token=/i, /reset/i]);
  });

  test('event RSVP confirmation email includes calendar subject', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const eventName = `Email RSVP ${uniqueHandle('ev')}`;
    const event = await createEvent(request, ownerToken, eventName);
    // Organizers cannot RSVP to their own events — use a second member.
    const { token: memberToken, email: memberEmail } =
      await registerMember(request);
    await clearMailpit();
    const rsvp = await request.post(
      `/api/openpeeps/core/v1/posts/${event.id}/rsvp`,
      {
        headers: apiHeaders(memberToken),
        data: { response: 'yes' },
      },
    );
    expect(rsvp.ok(), await rsvp.text()).toBeTruthy();
    const mail = await waitForMail(memberEmail, /you're going:/i);
    await expectMailContent(mail, [eventName]);
  });

  test('follow notification email is delivered', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const ownerProfile = await currentProfile(request, ownerToken);
    const { token: memberToken, handle } = await registerMember(request);

    await clearMailpit();
    const follow = await request.post(
      `/api/openpeeps/core/v1/profiles/${ownerProfile.id}/follow`,
      { headers: apiHeaders(memberToken), data: {} },
    );
    expect(follow.ok(), await follow.text()).toBeTruthy();
    const mail = await waitForMail(
      owner.email,
      new RegExp(`${handle}.*following`, 'i'),
    );
    await expectMailContent(mail, [handle, /follow/i]);
  });

  test('reply notification email is delivered', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const note = await createNote(
      request,
      ownerToken,
      `Reply parent ${uniqueHandle('rp')}`,
    );
    const { token: memberToken, handle } = await registerMember(request);
    const replyContent = `Reply body ${handle}`;

    await clearMailpit();
    const reply = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(memberToken),
      data: {
        type: 'note',
        visibility: 'local',
        inReplyToId: note.id,
        data: { type: 'note', content: replyContent },
      },
    });
    expect(reply.ok(), await reply.text()).toBeTruthy();
    const mail = await waitForMail(
      owner.email,
      new RegExp(`${handle}.*replied`, 'i'),
    );
    await expectMailContent(mail, [replyContent]);
  });

  test('mention notification email is delivered', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    // Ensure owner settings keep mention email on (default).
    await enableEmailNotifications(request, ownerToken, ['mention']);
    const { token: memberToken, handle } = await registerMember(request);
    const content = `Hello @${owner.handle} from ${handle}`;

    await clearMailpit();
    const note = await createNote(request, memberToken, content);
    expect(note.id).toBeTruthy();
    const mail = await waitForMail(owner.email, /mentioned you/i);
    await expectMailContent(mail, [handle, owner.handle]);
  });

  test('direct message notification email is delivered', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const ownerProfile = await currentProfile(request, ownerToken);
    const {
      token: memberToken,
      email: memberEmail,
      handle,
    } = await registerMember(request);
    const memberProfile = await currentProfile(request, memberToken);

    const ownerBody = await (
      await request.get(`/api/openpeeps/core/v1/profiles/${ownerProfile.id}`, {
        headers: apiHeaders(ownerToken),
      })
    ).json();
    const memberBody = await (
      await request.get(`/api/openpeeps/core/v1/profiles/${memberProfile.id}`, {
        headers: apiHeaders(memberToken),
      })
    ).json();

    const dmContent = `DM hello ${handle}`;
    await clearMailpit();
    const dm = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(ownerToken),
      data: {
        type: 'note',
        visibility: 'direct',
        audience: [ownerBody, memberBody],
        data: { type: 'note', content: dmContent },
      },
    });
    expect(dm.ok(), await dm.text()).toBeTruthy();
    const mail = await waitForMail(memberEmail, /direct message/i);
    await expectMailContent(mail, [dmContent, /conversation/i]);
  });

  test('announcement notification email is delivered', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const { email: memberEmail, token: memberToken } =
      await registerMember(request);
    await enableEmailNotifications(request, memberToken, ['announcement']);

    const content = `Announcement ${uniqueHandle('an')}`;
    const note = await createNote(request, ownerToken, content);
    await clearMailpit();
    await announcePost(request, ownerToken, note.id);
    const mail = await waitForMail(memberEmail, /announcement/i);
    await expectMailContent(mail, [content]);
  });

  test('new group post notification email is delivered', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const handle = uniqueHandle('gp');
    const group = await createGroup(request, ownerToken, {
      handle,
      displayName: `EmailGrp ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });

    const {
      token: memberToken,
      email: memberEmail,
      handle: memberHandle,
    } = await registerMember(request);
    const join = await request.post(
      `/api/openpeeps/core/v1/groups/${group.id}/join`,
      { headers: apiHeaders(memberToken), data: {} },
    );
    expect(join.ok(), await join.text()).toBeTruthy();

    const content = `Group post for ${memberHandle}`;
    await clearMailpit();
    const post = await createNote(request, ownerToken, content, {
      groupId: group.id,
    });
    expect(post.id).toBeTruthy();
    const mail = await waitForMail(memberEmail, /new post in/i);
    await expectMailContent(mail, [content, handle]);
  });

  test('new profile notification email is delivered to admins', async ({
    request,
  }) => {
    await clearMailpit();
    const { handle } = await registerMember(request, { promote: false });
    const mail = await waitForMail(owner.email, /new profile created/i);
    await expectMailContent(mail, [handle, /profile/i]);
  });

  test('reaction email is delivered when opted in', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    await enableEmailNotifications(request, ownerToken, ['reaction']);
    const content = `React target ${uniqueHandle('rx')}`;
    const note = await createNote(request, ownerToken, content);
    const { token: memberToken, handle } = await registerMember(request);

    await clearMailpit();
    const react = await request.post(
      `/api/openpeeps/core/v1/posts/${note.id}/react`,
      {
        headers: apiHeaders(memberToken),
        data: { reaction: '👍' },
      },
    );
    expect(react.ok(), await react.text()).toBeTruthy();
    const mail = await waitForMail(
      owner.email,
      new RegExp(`${handle}.*reacted`, 'i'),
    );
    await expectMailContent(mail, [content]);
  });

  test('repost email is delivered when opted in', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    await enableEmailNotifications(request, ownerToken, ['repost']);
    const content = `Repost target ${uniqueHandle('rs')}`;
    const note = await createNote(request, ownerToken, content);
    const { token: memberToken, handle } = await registerMember(request);

    await clearMailpit();
    await repostNote(request, memberToken, note.id);
    const mail = await waitForMail(
      owner.email,
      new RegExp(`${handle}.*reposted`, 'i'),
    );
    await expectMailContent(mail, [content]);
  });

  test('groupAdded email is delivered when opted in', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const handle = uniqueHandle('ga');
    const group = await createGroup(request, ownerToken, {
      handle,
      displayName: `Add ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });
    const {
      token: memberToken,
      email: memberEmail,
      handle: memberHandle,
    } = await registerMember(request);
    const memberProfile = await getPublicProfile(
      request,
      ownerToken,
      (await currentProfile(request, memberToken)).id,
    );
    await enableEmailNotifications(request, memberToken, ['groupAdded']);

    await clearMailpit();
    await addGroupMember(request, ownerToken, group.id, memberProfile);
    const mail = await waitForMail(
      memberEmail,
      new RegExp(`added to a group.*${handle}|${handle}`, 'i'),
    );
    await expectMailContent(mail, [handle, /group/i]);
    expect(memberHandle).toBeTruthy();
  });

  test('groupMemberJoined email is delivered when opted in', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    await enableEmailNotifications(request, ownerToken, ['groupMemberJoined']);
    const handle = uniqueHandle('gj');
    const group = await createGroup(request, ownerToken, {
      handle,
      displayName: `Join ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });
    const { token: memberToken, handle: memberHandle } =
      await registerMember(request);

    await clearMailpit();
    const join = await request.post(
      `/api/openpeeps/core/v1/groups/${group.id}/join`,
      { headers: apiHeaders(memberToken), data: {} },
    );
    expect(join.ok(), await join.text()).toBeTruthy();
    const mail = await waitForMail(
      owner.email,
      new RegExp(`${memberHandle}.*joined`, 'i'),
    );
    await expectMailContent(mail, [memberHandle, handle]);
  });

  test('groupMemberLeft email is delivered when opted in', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    await enableEmailNotifications(request, ownerToken, ['groupMemberLeft']);
    const handle = uniqueHandle('gl');
    const group = await createGroup(request, ownerToken, {
      handle,
      displayName: `Leave ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });
    const { token: memberToken, handle: memberHandle } =
      await registerMember(request);
    const join = await request.post(
      `/api/openpeeps/core/v1/groups/${group.id}/join`,
      { headers: apiHeaders(memberToken), data: {} },
    );
    expect(join.ok(), await join.text()).toBeTruthy();

    await clearMailpit();
    const leave = await request.delete(
      `/api/openpeeps/core/v1/groups/${group.id}/leave`,
      { headers: apiHeaders(memberToken) },
    );
    expect(leave.ok(), await leave.text()).toBeTruthy();
    const mail = await waitForMail(
      owner.email,
      new RegExp(`${memberHandle}.*left`, 'i'),
    );
    await expectMailContent(mail, [memberHandle, handle]);
  });

  test('UI signup delivers welcome and validation emails', async ({ page }) => {
    const handle = uniqueHandle('ui');
    const email = `${handle}@openpeeps.test`;
    await clearMailpit();

    await page.goto('/auth/register');
    await page.getByTestId(testIds.auth.registerHandle).fill(handle);
    await page.getByTestId(testIds.auth.registerName).fill(handle);
    await page.getByTestId(testIds.auth.registerEmail).fill(email);
    await page.getByTestId(testIds.auth.registerPassword).fill('testtest12');
    await page
      .getByTestId(testIds.auth.registerConfirmPassword)
      .fill('testtest12');
    await page.getByTestId(testIds.auth.registerPrivacyCheckbox).check();
    await page.getByTestId(testIds.auth.registerSubmit).click();
    await expect(page).toHaveURL(/\/welcome|\/feeds\/local|\/payment/, {
      timeout: 30_000,
    });

    const welcome = await waitForMail(email, /welcome to/i);
    await expectMailContent(welcome, [
      /welcome/i,
      /have fun/i,
      /settings\/notifications/i,
    ]);
    const validate = await waitForMail(email, /validate your email/i);
    await expectMailContent(validate, [/[?&]token=/i]);
  });

  test('UI forgot-password form delivers reset email', async ({
    page,
    request,
  }) => {
    const { email } = await registerMember(request, { promote: false });
    await clearMailpit();

    await page.goto('/auth/request-reset-password');
    await expect(
      page.getByTestId(testIds.auth.requestResetHeading),
    ).toBeVisible();
    await page.getByTestId(testIds.auth.requestResetEmail).fill(email);
    await page.getByTestId(testIds.auth.requestResetSubmit).click();
    const mail = await waitForMail(email, /reset your password/i);
    await expectMailContent(mail, [/reset|password/i, /http/i]);
  });

  test('UI welcome checklist resends validation email', async ({
    page,
    request,
  }) => {
    const handle = uniqueHandle('wv');
    const email = `${handle}@openpeeps.test`;
    const { token } = await registerUser(request, {
      handle,
      email,
      password: 'testtest12',
    });
    await page.addInitScript((authToken: string) => {
      window.localStorage.setItem(
        'auth_credentials',
        JSON.stringify({ token: authToken }),
      );
    }, token);

    await clearMailpit();
    await page.goto('/welcome');
    await page.getByTestId(testIds.welcome.verifyEmail).click();
    const mail = await waitForMail(email, /validate your email/i);
    await expectMailContent(mail, [/validate|confirm/i, /http/i]);
  });

  test('webhook push subscription receives test notification', async ({
    request,
  }) => {
    const catcher = await startPushCatcher();
    try {
      const { token } = await loginUser(request, owner.email, owner.password);
      await createWebhookPushSubscription(
        request,
        token,
        catcher.url,
        catcher.publicKey,
      );
      const result = await sendTestPush(request, token, catcher.publicKey);
      expect(result.success !== false).toBeTruthy();

      if (process.env.PUSH_CATCHER_ASSERT === 'delivery-only') {
        return;
      }

      const push = await waitForPush(catcher);
      expect(push.body).toBeTruthy();
      const body = push.body as {
        notification?: { title?: string };
        token?: string;
      };
      // Webhook push wraps the payload in a signed JWT `{ token }`.
      const titleFromJwt = (() => {
        if (!body.token) return undefined;
        try {
          const payload = JSON.parse(
            Buffer.from(body.token.split('.')[1] ?? '', 'base64url').toString(),
          ) as { payload?: { notification?: { title?: string } } };
          return payload.payload?.notification?.title;
        } catch {
          return undefined;
        }
      })();
      expect(
        body.notification?.title ?? titleFromJwt ?? JSON.stringify(push.body),
      ).toMatch(/test/i);
    } finally {
      await catcher.close();
    }
  });
});
