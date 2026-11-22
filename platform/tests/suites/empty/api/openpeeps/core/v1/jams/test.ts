import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  apiHeaders,
  currentProfile,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../../../../../../helpers/api';

// Integration coverage for the two jam-moderation routes added in #303
// (remove-participant + lift-ban) and the ban rejoin block in
// `createJamToken`. The routes are exercised on a PUBLIC jam on purpose: the
// host-or-moderator gate must not be the `ensurePostCapabilities` early-return
// (which passes every caller for public jams) — a non-moderator member must
// still get 403 on both routes here. The ban/token assertions need no LiveKit:
// `createJamToken` rejects with `error.jamBanned` before it ever reaches the
// room service, and the ban is asserted on the persisted post `data`.

// Seeded by seed.setup.ts as the FIRST account, i.e. the community owner.
const OWNER = { email: 'test@test.com', password: 'testtest' };

const createPublicJam = async (
  request: APIRequestContext,
  token: string,
  moderatorId: string,
  name: string,
) => {
  const create = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'event',
      visibility: 'public',
      data: {
        type: 'event',
        name,
        content: 'Public jam',
        start: new Date(Date.now() + 60_000).toISOString(),
        end: new Date(Date.now() + 3_600_000).toISOString(),
        wholeDay: false,
        jam: {
          type: 'video-call',
          videoEnabled: true,
          moderators: [moderatorId],
          waitingRoom: false,
        },
      },
    },
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  return (await create.json()) as { id: string };
};

const getPost = async (
  request: APIRequestContext,
  token: string,
  id: string,
) => {
  const res = await request.get(`/api/openpeeps/core/v1/posts/${id}`, {
    headers: apiHeaders(token),
  });
  expect(
    res.ok(),
    `reading post ${id} failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return (await res.json()) as { data?: { jam?: { banned?: string[] } } };
};

const bannedIds = async (
  request: APIRequestContext,
  token: string,
  id: string,
) => (await getPost(request, token, id)).data?.jam?.banned ?? [];

const jamToken = async (
  request: APIRequestContext,
  token: string,
  jamId: string,
) => {
  const res = await request.get(`/api/openpeeps/core/v1/jams/${jamId}/token`, {
    headers: apiHeaders(token),
  });
  const body = (await res.json().catch(() => ({}))) as {
    key?: string;
    success?: boolean;
  };
  return { status: res.status(), key: body.key, success: body.success };
};

test.describe('Jam moderation routes and ban rejoin block (#303)', () => {
  test('non-moderator 403s on both routes; host remove bans, lift restores token', async ({
    request,
  }) => {
    // The jam host is the seeded community owner (seed.setup.ts registers it
    // as the first account, which becomes `owner`).
    const { token: hostToken } = await loginUser(
      request,
      OWNER.email,
      OWNER.password,
    );
    const hostProfile = await currentProfile(request, hostToken);

    const registerMember = async (prefix: string) => {
      const handle = uniqueHandle(prefix);
      const email = `${handle}@openpeeps.test`;
      const { token } = await registerUser(request, {
        handle,
        email,
        password: 'testtest12',
      });
      const profile = await currentProfile(request, token);
      return { token, profile, handle };
    };

    const member = await registerMember('jammem');
    const outsider = await registerMember('jamout');

    const jam = await createPublicJam(
      request,
      hostToken,
      hostProfile.id,
      `Ban jam ${Date.now()}`,
    );

    // 1. The host (a moderator) removes the member — 200 — and the ban is
    //    persisted on the post data.
    const remove = await request.post(
      `/api/openpeeps/core/v1/jams/${jam.id}/remove-participant`,
      { headers: apiHeaders(hostToken), data: { identity: member.profile.id } },
    );
    expect(remove.ok(), await remove.text()).toBeTruthy();
    expect(await bannedIds(request, hostToken, jam.id)).toContain(
      member.profile.id,
    );

    // 2. The removed member's token request is refused by the ban gate
    //    (fires before the room service, so this is LiveKit-independent).
    const bannedToken = await jamToken(request, member.token, jam.id);
    expect(bannedToken.status).toBe(403);
    expect(bannedToken.key).toBe('error.jamBanned');

    // 3. A non-moderator member is 403'd on BOTH routes, and the ban state is
    //    unchanged. On a public jam this specifically proves the gate is the
    //    host-or-moderator check, not the ensurePostCapabilities early-return.
    const outsiderRemove = await request.post(
      `/api/openpeeps/core/v1/jams/${jam.id}/remove-participant`,
      {
        headers: apiHeaders(outsider.token),
        data: { identity: member.profile.id },
      },
    );
    expect(outsiderRemove.status()).toBe(403);

    const outsiderLift = await request.delete(
      `/api/openpeeps/core/v1/jams/${jam.id}/bans/${member.profile.id}`,
      { headers: apiHeaders(outsider.token) },
    );
    expect(outsiderLift.status()).toBe(403);

    // The failed attempts must not have touched the ban list.
    expect(await bannedIds(request, hostToken, jam.id)).toContain(
      member.profile.id,
    );

    // 4. The host lifts the ban — 200 — the ban list clears, and the member is
    //    no longer refused by the ban gate (a different token error / success).
    const lift = await request.delete(
      `/api/openpeeps/core/v1/jams/${jam.id}/bans/${member.profile.id}`,
      { headers: apiHeaders(hostToken) },
    );
    expect(lift.ok(), await lift.text()).toBeTruthy();
    expect(await bannedIds(request, hostToken, jam.id)).not.toContain(
      member.profile.id,
    );

    const liftedToken = await jamToken(request, member.token, jam.id);
    expect(liftedToken.key).not.toBe('error.jamBanned');
  });
});
