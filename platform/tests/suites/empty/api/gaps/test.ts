import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  createGroup,
  createNote,
  createQuestion,
  currentProfile,
  loginUser,
  patchAdminConfig,
  registerUser,
  uniqueHandle,
} from '../../../../helpers/api';

const owner = {
  email: 'test@test.com',
  password: 'testtest',
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

type ApiRequest = Parameters<typeof registerUser>[0];

/** Promote without Mailpit — admin role assignment is enough for caps under test. */
const promoteToMemberViaAdmin = async (
  request: ApiRequest,
  adminToken: string,
  profileId: string,
) => {
  const rolesResponse = await request.get(
    '/api/openpeeps/core/v1/admin/roles',
    { headers: apiHeaders(adminToken) },
  );
  expect(rolesResponse.ok(), await rolesResponse.text()).toBeTruthy();
  const roles = (await rolesResponse.json()) as Array<{ key: string }>;
  const memberRole = roles.find((role) => role.key === 'member');
  expect(memberRole, 'member role missing').toBeTruthy();

  const update = await request.put(
    `/api/openpeeps/core/v1/admin/profiles/${profileId}/roles`,
    {
      headers: apiHeaders(adminToken),
      data: { roles: [memberRole] },
    },
  );
  expect(update.ok(), await update.text()).toBeTruthy();
};

const registerMember = async (request: ApiRequest) => {
  const { token: ownerToken } = await loginUser(
    request,
    owner.email,
    owner.password,
  );
  const handle = uniqueHandle('gap');
  const email = `${handle}@openpeeps.test`;
  const { token } = await registerUser(request, {
    handle,
    email,
    password: 'testtest12',
  });
  const profile = await currentProfile(request, token);
  await promoteToMemberViaAdmin(request, ownerToken, profile.id);
  return { token, handle, email };
};

test.describe('API coverage gaps', () => {
  test('health and server info are public', async ({ request }) => {
    const health = await request.get('/health');
    expect(health.ok()).toBeTruthy();
    expect(await health.json()).toMatchObject({ status: 'ok' });

    const info = await request.get('/api/openpeeps/core/v1/server/info');
    expect(info.ok()).toBeTruthy();
    const body = (await info.json()) as {
      communityConfig?: { info?: { name?: string } };
      publicContent?: boolean;
    };
    expect(body.communityConfig?.info?.name).toBeTruthy();
    expect(typeof body.publicContent).toBe('boolean');
  });

  test('protected routes reject missing Bearer', async ({ request }) => {
    const paths = [
      '/api/openpeeps/core/v1/profiles/current',
      '/api/openpeeps/core/v1/posts/feeds/my',
      '/api/openpeeps/core/v1/conversations',
      '/api/openpeeps/core/v1/admin/stats',
      '/api/openpeeps/core/v1/search/posts?q=test',
    ];

    for (const path of paths) {
      const response = await request.get(path);
      expect(
        response.status(),
        `${path} should require auth`,
      ).toBeGreaterThanOrEqual(401);
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('pending member cannot access admin stats', async ({ request }) => {
    const handle = uniqueHandle('pend');
    const { token } = await registerUser(request, {
      handle,
      email: `${handle}@openpeeps.test`,
      password: 'testtest12',
    });
    const response = await request.get('/api/openpeeps/core/v1/admin/stats', {
      headers: apiHeaders(token),
    });
    expect(response.status()).toBe(403);
  });

  test('bad login credentials fail', async ({ request }) => {
    const response = await request.post('/api/openpeeps/core/v1/auth/login', {
      data: { email: owner.email, password: 'wrong-password' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test('closed registration rejects signup without invite', async ({
    request,
  }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );

    // PATCH replaces the stored overlay. Do not round-trip GET's sanitized
    // merged config (secrets become '*********') or the server breaks.
    try {
      await patchAdminConfig(request, ownerToken, 'openpeeps', 'core', {
        server: { signUpsOpen: false },
      });

      const handle = uniqueHandle('closed');
      const response = await request.post(
        '/api/openpeeps/core/v1/auth/register',
        {
          data: {
            handle,
            displayName: handle,
            email: `${handle}@openpeeps.test`,
            password: 'testtest12',
            privacyPolicyAccepted: true,
          },
        },
      );
      expect(response.status(), await response.text()).toBe(403);
    } finally {
      await patchAdminConfig(request, ownerToken, 'openpeeps', 'core', {
        server: { signUpsOpen: true },
      });
    }
  });

  test('create question, vote, and undo vote', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const question = await createQuestion(
      request,
      token,
      `Favorite letter ${uniqueHandle('q')}`,
      ['A', 'B', 'C'],
    );

    const vote = await request.post(
      `/api/openpeeps/core/v1/posts/${question.id}/vote`,
      {
        headers: apiHeaders(token),
        data: { selection: [0] },
      },
    );
    expect(vote.ok(), await vote.text()).toBeTruthy();

    const undo = await request.post(
      `/api/openpeeps/core/v1/posts/${question.id}/vote`,
      {
        headers: apiHeaders(token),
        data: { selection: [] },
      },
    );
    expect(undo.ok(), await undo.text()).toBeTruthy();
  });

  test('repost a note', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const note = await createNote(
      request,
      token,
      `Repost me ${uniqueHandle('rp')}`,
    );

    const repost = await request.post(
      `/api/openpeeps/core/v1/posts/${note.id}/reposts`,
      {
        headers: apiHeaders(token),
        data: {},
      },
    );
    expect(repost.ok(), await repost.text()).toBeTruthy();

    const reposts = await request.get(
      `/api/openpeeps/core/v1/posts/${note.id}/reposts`,
      { headers: apiHeaders(token) },
    );
    expect(reposts.ok()).toBeTruthy();
    const list = await reposts.json();
    expect(Array.isArray(list) ? list.length : 0).toBeGreaterThan(0);
  });

  test('search posts finds created content', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const needle = `searchneedle${uniqueHandle('s')}`;
    await createNote(request, token, `Hello ${needle} world`);

    await expect
      .poll(
        async () => {
          const response = await request.get(
            `/api/openpeeps/core/v1/search/posts?q=${encodeURIComponent(needle)}&limit=15&offset=0`,
            { headers: apiHeaders(token) },
          );
          if (!response.ok()) return false;
          const results = (await response.json()) as Array<{
            data?: { data?: { content?: string } };
          }>;
          return results.some((item) =>
            item.data?.data?.content?.includes(needle),
          );
        },
        { timeout: 45_000, intervals: [500, 1000, 2000] },
      )
      .toBe(true);
  });

  test('admin stats, groups list, and logs', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);

    const stats = await request.get('/api/openpeeps/core/v1/admin/stats', {
      headers: apiHeaders(token),
    });
    expect(stats.ok(), await stats.text()).toBeTruthy();

    const groups = await request.get('/api/openpeeps/core/v1/admin/groups', {
      headers: apiHeaders(token),
    });
    expect(groups.ok(), await groups.text()).toBeTruthy();

    const logs = await request.get('/api/openpeeps/core/v1/admin/logs', {
      headers: apiHeaders(token),
    });
    expect(logs.ok(), await logs.text()).toBeTruthy();
  });

  test('pin post globally then clear pin', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const note = await createNote(
      request,
      token,
      `Pinned ${uniqueHandle('pin')}`,
    );

    const pin = await request.patch(
      '/api/openpeeps/core/v1/admin/pinned-post',
      {
        headers: apiHeaders(token),
        data: { postId: note.id },
      },
    );
    expect(pin.ok(), await pin.text()).toBeTruthy();

    const unpin = await request.patch(
      '/api/openpeeps/core/v1/admin/pinned-post',
      {
        headers: apiHeaders(token),
        data: { postId: '' },
      },
    );
    expect(unpin.ok(), await unpin.text()).toBeTruthy();
  });

  test('announce a local post', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const note = await createNote(
      request,
      token,
      `Announce ${uniqueHandle('an')}`,
    );

    const announce = await request.post(
      `/api/openpeeps/core/v1/admin/posts/${note.id}/announce`,
      { headers: apiHeaders(token), data: {} },
    );
    expect(announce.ok(), await announce.text()).toBeTruthy();
  });

  test('personal access token create, list, and revoke', async ({
    request,
  }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const name = `pat-${uniqueHandle('t')}`;

    const create = await request.post(
      '/api/openpeeps/core/v1/profiles/current/access-tokens',
      {
        headers: apiHeaders(token),
        data: {
          name,
          description: 'integration gap coverage',
          expirationTime: '30d',
          scopes: [
            { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
          ],
        },
      },
    );
    expect(create.ok(), await create.text()).toBeTruthy();
    const created = (await create.json()) as { id: string };
    expect(created.id).toBeTruthy();

    const list = await request.get(
      '/api/openpeeps/core/v1/profiles/current/access-tokens',
      { headers: apiHeaders(token) },
    );
    expect(list.ok()).toBeTruthy();
    const tokens = (await list.json()) as Array<{ id: string; name?: string }>;
    expect(tokens.some((entry) => entry.id === created.id)).toBe(true);

    const revoke = await request.delete(
      `/api/openpeeps/core/v1/profiles/current/access-tokens/${created.id}`,
      { headers: apiHeaders(token) },
    );
    expect(revoke.ok(), await revoke.text()).toBeTruthy();
  });

  test('service access token create and revoke', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const name = `svc-${uniqueHandle('s')}`;

    const create = await request.post(
      '/api/openpeeps/core/v1/admin/service-access-tokens',
      {
        headers: apiHeaders(token),
        data: {
          name,
          description: 'service gap coverage',
          expirationTime: '30d',
          scopes: [{ scopeLevel: 'read', resource: { type: '*', id: '*' } }],
        },
      },
    );
    expect(create.ok(), await create.text()).toBeTruthy();
    const created = (await create.json()) as { id: string };
    expect(created.id).toBeTruthy();

    const revoke = await request.delete(
      `/api/openpeeps/core/v1/admin/service-access-tokens/${created.id}`,
      { headers: apiHeaders(token) },
    );
    expect(revoke.ok(), await revoke.text()).toBeTruthy();
  });

  test('mark all notifications as seen', async ({ request }) => {
    // Creating notifications requires the once-queue worker; user-actions
    // covers follow→notification. This case covers the mark-all-seen route.
    const { token } = await loginUser(request, owner.email, owner.password);
    const markSeen = await request.put(
      '/api/openpeeps/core/v1/profiles/current/notifications/mark-all-seen',
      { headers: apiHeaders(token), data: {} },
    );
    expect(markSeen.ok(), await markSeen.text()).toBeTruthy();
  });

  test('RSVP tentative and no cycle', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const start = new Date(Date.now() + 120_000).toISOString();
    const end = new Date(Date.now() + 3_600_000).toISOString();
    const create = await request.post('/api/openpeeps/core/v1/posts', {
      headers: apiHeaders(token),
      data: {
        type: 'event',
        visibility: 'local',
        data: {
          type: 'event',
          name: `RSVP cycle ${uniqueHandle('ev')}`,
          content: 'rsvp cycle',
          start,
          end,
          wholeDay: false,
        },
      },
    });
    expect(create.ok(), await create.text()).toBeTruthy();
    const event = (await create.json()) as { id: string };

    for (const response of ['tentative', 'no', 'yes'] as const) {
      const rsvp = await request.post(
        `/api/openpeeps/core/v1/posts/${event.id}/rsvp`,
        {
          headers: apiHeaders(token),
          data: { response },
        },
      );
      expect(rsvp.ok(), await rsvp.text()).toBeTruthy();
    }
  });

  test('duplicate profile handle returns conflict', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const ownerProfile = await currentProfile(request, ownerToken);
    const { token: memberToken } = await registerMember(request);

    const duplicate = await request.patch(
      '/api/openpeeps/core/v1/profiles/current',
      {
        headers: apiHeaders(memberToken),
        data: {
          handle: ownerProfile.handle,
          type: 'local',
        },
      },
    );
    expect(duplicate.status()).toBe(409);
    const body = (await duplicate.json()) as { message?: string };
    expect(body.message).toBe('profiles.handleExists');
  });

  test('duplicate group handle returns conflict', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const handle = uniqueHandle('dup');
    await createGroup(request, token, {
      handle,
      displayName: `Dup ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });

    const duplicate = await request.post('/api/openpeeps/core/v1/groups', {
      headers: apiHeaders(token),
      data: {
        handle,
        displayName: `Other ${handle}`.slice(0, 30),
        discoverable: true,
        capabilities: memberCaps,
      },
    });
    expect([409, 422]).toContain(duplicate.status());
  });

  test('group member can leave after joining', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const handle = uniqueHandle('lv');
    const group = await createGroup(request, ownerToken, {
      handle,
      displayName: `Leave ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });

    const { token: memberToken } = await registerMember(request);
    const join = await request.post(
      `/api/openpeeps/core/v1/groups/${group.id}/join`,
      { headers: apiHeaders(memberToken), data: {} },
    );
    expect(join.ok(), await join.text()).toBeTruthy();

    const leave = await request.delete(
      `/api/openpeeps/core/v1/groups/${group.id}/leave`,
      { headers: apiHeaders(memberToken) },
    );
    expect(leave.ok(), await leave.text()).toBeTruthy();
  });

  test('admin reopen a resolved report', async ({ request }) => {
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const { token: memberToken } = await registerMember(request);
    const memberProfile = await currentProfile(request, memberToken);
    const note = await createNote(
      request,
      memberToken,
      `Reopenable ${uniqueHandle('rr')}`,
    );

    const report = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(ownerToken),
      data: {
        profileId: memberProfile.id,
        postIds: [note.id],
        report: {
          comment: 'reopen coverage',
          category: 'spam',
        },
      },
    });
    expect(report.ok(), await report.text()).toBeTruthy();
    const created = (await report.json()) as { id: string };

    const resolve = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/resolve`,
      {
        headers: apiHeaders(ownerToken),
        data: { resolution: 'ignore' },
      },
    );
    expect(resolve.ok(), await resolve.text()).toBeTruthy();

    const reopen = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/reopen`,
      { headers: apiHeaders(ownerToken), data: {} },
    );
    expect(reopen.ok(), await reopen.text()).toBeTruthy();
  });

  test('posts seen and unseen counts', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const note = await createNote(
      request,
      token,
      `Seen ${uniqueHandle('seen')}`,
    );

    const seen = await request.post('/api/openpeeps/core/v1/posts/seen', {
      headers: apiHeaders(token),
      data: { postIds: [note.id] },
    });
    expect(seen.ok(), await seen.text()).toBeTruthy();

    const counts = await request.get(
      '/api/openpeeps/core/v1/posts/unseen/counts',
      { headers: apiHeaders(token) },
    );
    expect(counts.ok(), await counts.text()).toBeTruthy();
  });

  test('admin delete group', async ({ request }) => {
    const { token } = await loginUser(request, owner.email, owner.password);
    const handle = uniqueHandle('dg');
    const group = await createGroup(request, token, {
      handle,
      displayName: `Delete ${handle}`.slice(0, 30),
      capabilities: memberCaps,
    });

    const del = await request.delete(
      `/api/openpeeps/core/v1/admin/groups/${group.id}`,
      { headers: apiHeaders(token) },
    );
    expect(del.ok(), await del.text()).toBeTruthy();
  });
});
