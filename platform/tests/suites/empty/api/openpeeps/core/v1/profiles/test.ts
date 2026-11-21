import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  apiHeaders,
  currentProfile,
  loginUser,
  registerUser,
  uniqueHandle,
} from '../../../../../../../helpers/api';

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';
const MEMBER_PASSWORD = 'testtest12';

const registerMember = async (request: APIRequestContext) => {
  const handle = uniqueHandle('dir');
  const email = `${handle}@openpeeps.test`;
  const registered = await registerUser(request, {
    handle,
    email,
    password: MEMBER_PASSWORD,
  });
  const profile = await currentProfile(request, registered.token);
  return { id: profile.id, token: registered.token };
};

const listProfiles = async (
  request: APIRequestContext,
  token: string | null,
  directory?: boolean,
) => {
  const response = await request.get(
    `/api/openpeeps/core/v1/profiles${directory ? '?directory=true' : ''}`,
    { headers: token ? apiHeaders(token) : {} },
  );
  expect(
    response.ok(),
    `GET /profiles${directory ? '?directory=true' : ''} failed: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as { id: string; handle: string }[];
};

const setDiscoverable = async (
  request: APIRequestContext,
  token: string,
  discoverable: boolean,
) => {
  const response = await request.patch(
    '/api/openpeeps/core/v1/profiles/current',
    // updateProfileRequestSchema derives `type` from profileDataSchema, so the
    // PATCH body must carry it (the web settings screen sends `type: me.type`).
    { headers: apiHeaders(token), data: { discoverable, type: 'local' } },
  );
  expect(
    response.ok(),
    `PATCH /profiles/current failed: ${await response.text()}`,
  ).toBeTruthy();
};

test.describe('member directory opt-out (discoverable)', () => {
  test('opted-out profile: hidden in member directory, present in pickers and the owner directory', async ({
    request,
  }) => {
    const owner = await loginUser(request, OWNER_EMAIL, OWNER_PASSWORD);
    const memberA = await registerMember(request);
    const memberB = await registerMember(request);

    // Baseline: B sees A in the directory view before the opt-out.
    const directoryBefore = await listProfiles(request, memberB.token, true);
    expect(
      directoryBefore.some((p) => p.id === memberA.id),
      'member A missing from baseline directory',
    ).toBe(true);

    // A opts out of the member directory.
    await setDiscoverable(request, memberA.token, false);
    try {
      // B's directory view no longer contains A ...
      const directoryAfter = await listProfiles(request, memberB.token, true);
      expect(directoryAfter.some((p) => p.id === memberA.id)).toBe(false);

      // ... but the plain picker list still contains A (DMs/pickers keep working)
      // and the owner's directory view still contains A (core-profiles-read).
      const pickerAfter = await listProfiles(request, memberB.token);
      expect(pickerAfter.some((p) => p.id === memberA.id)).toBe(true);
      const ownerDirectory = await listProfiles(request, owner.token, true);
      expect(ownerDirectory.some((p) => p.id === memberA.id)).toBe(true);
    } finally {
      await setDiscoverable(request, memberA.token, true);
    }
  });
});
