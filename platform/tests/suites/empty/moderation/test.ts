import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  createNote,
  currentProfile,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../../helpers/api';

const owner = {
  email: 'test@test.com',
  password: 'testtest',
};

type ApiRequest = Parameters<typeof registerUser>[0];

type ReportBody = {
  id: string;
  comment: string;
  category: string;
  resolution?: string;
  reporterProfile?: {
    id: string;
    handle: string;
    displayName?: string;
    deletedAt?: string | null;
  };
  reportedProfile?: { id: string; handle: string };
  reportedPosts?: { id: string }[];
};

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

const registerMember = async (request: ApiRequest, prefix = 'mod') => {
  const { token: ownerToken } = await loginUser(
    request,
    owner.email,
    owner.password,
  );
  const handle = uniqueHandle(prefix);
  const email = `${handle}@openpeeps.test`;
  const { token } = await registerUser(request, {
    handle,
    email,
    password: 'testtest12',
  });
  const profile = await currentProfile(request, token);
  await promoteToMemberViaAdmin(request, ownerToken, profile.id);
  return { token, handle, email, profile, ownerToken };
};

const reportPayload = (
  profileId: string,
  postIds: string[],
  comment: string,
  category: 'spam' | 'violation' | 'other' = 'spam',
) => ({
  profileId,
  postIds,
  report: { comment, category, forward: false },
});

test.describe('moderation reports (API)', () => {
  test('unauthenticated report routes fail closed', async ({ request }) => {
    const post = await request.post('/api/openpeeps/core/v1/reports', {
      data: reportPayload('00000000-0000-0000-0000-000000000000', [], 'x'),
    });
    expect(post.status()).toBeGreaterThanOrEqual(401);

    const list = await request.get('/api/openpeeps/core/v1/reports');
    expect(list.status()).toBeGreaterThanOrEqual(401);

    const adminList = await request.get('/api/openpeeps/core/v1/admin/reports');
    expect(adminList.status()).toBeGreaterThanOrEqual(401);
  });

  test('pending member cannot create a report', async ({ request }) => {
    const handle = uniqueHandle('pend');
    const { token } = await registerUser(request, {
      handle,
      email: `${handle}@openpeeps.test`,
      password: 'testtest12',
    });
    const { token: ownerToken } = await loginUser(
      request,
      owner.email,
      owner.password,
    );
    const ownerProfile = await currentProfile(request, ownerToken);

    const response = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(token),
      data: reportPayload(ownerProfile.id, [], 'pending cannot report'),
    });
    expect(response.status(), await response.text()).toBe(403);
  });

  test('member reports a post; admin lists, resolves, and reopens', async ({
    request,
  }) => {
    const reporter = await registerMember(request, 'rep');
    const author = await registerMember(request, 'aut');
    const note = await createNote(
      request,
      author.token,
      `Reportable ${author.handle}`,
    );

    const createdRes = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(reporter.token),
      data: reportPayload(
        author.profile.id,
        [note.id],
        'spam for moderation suite',
      ),
    });
    expect(createdRes.ok(), await createdRes.text()).toBeTruthy();
    const created = (await createdRes.json()) as ReportBody;
    expect(created.id).toBeTruthy();
    expect(created.category).toBe('spam');
    expect(created.resolution).toBeFalsy();
    expect(created.reportedPosts?.map((p) => p.id)).toContain(note.id);

    const mine = await request.get('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(reporter.token),
    });
    expect(mine.ok(), await mine.text()).toBeTruthy();
    const mineList = (await mine.json()) as ReportBody[];
    expect(mineList.some((r) => r.id === created.id)).toBeTruthy();

    const mineDetail = await request.get(
      `/api/openpeeps/core/v1/reports/${created.id}`,
      { headers: apiHeaders(reporter.token) },
    );
    expect(mineDetail.ok(), await mineDetail.text()).toBeTruthy();

    const otherDetail = await request.get(
      `/api/openpeeps/core/v1/reports/${created.id}`,
      { headers: apiHeaders(author.token) },
    );
    expect(otherDetail.status(), await otherDetail.text()).toBe(403);

    const memberAdminList = await request.get(
      '/api/openpeeps/core/v1/admin/reports',
      { headers: apiHeaders(reporter.token) },
    );
    expect(memberAdminList.status(), await memberAdminList.text()).toBe(403);

    const memberResolve = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/resolve`,
      {
        headers: apiHeaders(reporter.token),
        data: { resolution: 'ignore' },
      },
    );
    expect(memberResolve.status(), await memberResolve.text()).toBe(403);

    const adminList = await request.get(
      '/api/openpeeps/core/v1/admin/reports',
      {
        headers: apiHeaders(reporter.ownerToken),
      },
    );
    expect(adminList.ok(), await adminList.text()).toBeTruthy();
    const adminReports = (await adminList.json()) as ReportBody[];
    expect(adminReports.some((r) => r.id === created.id)).toBeTruthy();

    const adminDetail = await request.get(
      `/api/openpeeps/core/v1/admin/reports/${created.id}`,
      { headers: apiHeaders(reporter.ownerToken) },
    );
    expect(adminDetail.ok(), await adminDetail.text()).toBeTruthy();

    const resolve = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/resolve`,
      {
        headers: apiHeaders(reporter.ownerToken),
        data: { resolution: 'ignore' },
      },
    );
    expect(resolve.ok(), await resolve.text()).toBeTruthy();

    const resolvedDetail = await request.get(
      `/api/openpeeps/core/v1/admin/reports/${created.id}`,
      { headers: apiHeaders(reporter.ownerToken) },
    );
    const resolved = (await resolvedDetail.json()) as ReportBody;
    expect(resolved.resolution).toBe('ignore');

    const reopen = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/reopen`,
      { headers: apiHeaders(reporter.ownerToken), data: {} },
    );
    expect(reopen.ok(), await reopen.text()).toBeTruthy();

    const reopenedDetail = await request.get(
      `/api/openpeeps/core/v1/admin/reports/${created.id}`,
      { headers: apiHeaders(reporter.ownerToken) },
    );
    const reopened = (await reopenedDetail.json()) as ReportBody;
    expect(reopened.resolution).toBeFalsy();
  });

  test('member can file a profile-only report', async ({ request }) => {
    const reporter = await registerMember(request, 'prf');
    const target = await registerMember(request, 'tgt');

    const createdRes = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(reporter.token),
      data: reportPayload(target.profile.id, [], 'profile report', 'violation'),
    });
    expect(createdRes.ok(), await createdRes.text()).toBeTruthy();
    const created = (await createdRes.json()) as ReportBody;
    expect(created.category).toBe('violation');
    expect(created.reportedPosts ?? []).toHaveLength(0);
    expect(created.reportedProfile?.id).toBe(target.profile.id);
  });

  test('cannot report your own post or profile', async ({ request }) => {
    const member = await registerMember(request, 'slf');
    const note = await createNote(
      request,
      member.token,
      `Own post ${member.handle}`,
    );

    const ownPost = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(member.token),
      data: reportPayload(member.profile.id, [note.id], 'self post'),
    });
    expect(ownPost.status(), await ownPost.text()).toBe(403);

    const ownProfile = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(member.token),
      data: reportPayload(member.profile.id, [], 'self profile'),
    });
    expect(ownProfile.status(), await ownProfile.text()).toBe(403);
  });

  test('unknown reported profile is not found', async ({ request }) => {
    const member = await registerMember(request, 'nf');
    const response = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(member.token),
      data: reportPayload(
        '00000000-0000-4000-8000-000000000000',
        [],
        'missing profile',
      ),
    });
    expect(response.status(), await response.text()).toBe(404);
  });

  test('report from a deleted reporter still lists as a tombstone', async ({
    request,
  }) => {
    const reporter = await registerMember(request, 'gone');
    const author = await registerMember(request, 'kept');
    const note = await createNote(
      request,
      author.token,
      `Ghost report ${author.handle}`,
    );

    const createdRes = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(reporter.token),
      data: reportPayload(author.profile.id, [note.id], 'reporter will vanish'),
    });
    expect(createdRes.ok(), await createdRes.text()).toBeTruthy();
    const created = (await createdRes.json()) as ReportBody;

    const del = await request.delete(
      `/api/openpeeps/core/v1/admin/profiles/${reporter.profile.id}`,
      { headers: apiHeaders(reporter.ownerToken) },
    );
    expect(del.ok(), await del.text()).toBeTruthy();

    const adminList = await request.get(
      '/api/openpeeps/core/v1/admin/reports',
      { headers: apiHeaders(reporter.ownerToken) },
    );
    expect(adminList.ok(), await adminList.text()).toBeTruthy();
    const adminReports = (await adminList.json()) as ReportBody[];
    const listed = adminReports.find((r) => r.id === created.id);
    expect(
      listed,
      'report from deleted reporter missing from queue',
    ).toBeTruthy();
    expect(listed?.reporterProfile?.handle).toBe('deleted');
    expect(listed?.reporterProfile?.deletedAt).toBeTruthy();
  });

  test('admin can resolve by removing a reported post', async ({ request }) => {
    const reporter = await registerMember(request, 'rmv');
    const author = await registerMember(request, 'rmd');
    const note = await createNote(
      request,
      author.token,
      `Remove me ${author.handle}`,
    );

    const createdRes = await request.post('/api/openpeeps/core/v1/reports', {
      headers: apiHeaders(reporter.token),
      data: reportPayload(author.profile.id, [note.id], 'please remove'),
    });
    expect(createdRes.ok(), await createdRes.text()).toBeTruthy();
    const created = (await createdRes.json()) as ReportBody;

    const del = await request.delete(
      `/api/openpeeps/core/v1/posts/${note.id}`,
      { headers: apiHeaders(reporter.ownerToken) },
    );
    expect(del.ok(), await del.text()).toBeTruthy();

    const resolve = await request.put(
      `/api/openpeeps/core/v1/admin/reports/${created.id}/resolve`,
      {
        headers: apiHeaders(reporter.ownerToken),
        data: { resolution: 'remove' },
      },
    );
    expect(resolve.ok(), await resolve.text()).toBeTruthy();

    const detail = await request.get(
      `/api/openpeeps/core/v1/admin/reports/${created.id}`,
      { headers: apiHeaders(reporter.ownerToken) },
    );
    const resolved = (await detail.json()) as ReportBody;
    expect(resolved.resolution).toBe('remove');
  });
});
