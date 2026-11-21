import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  currentProfile,
  registerUser,
  uniqueHandle,
} from '../../helpers/api';

// The public fixture sets server.publicContent=true, so anonymous GET
// /profiles succeeds (ensureAccess yields an undefined viewer for anonymous
// visitors). This pins the anonymous-visitor directory branch end-to-end: an
// opted-out profile is absent from the ?directory=true list but still present
// in the plain list, so anonymous visitors keep being able to reach the
// profile page while the member directory hides them.
test.describe('member directory opt-out — anonymous viewer (public community)', () => {
  test('opted-out profile: hidden from the anonymous directory, present in the plain list', async ({
    request,
  }) => {
    const handle = uniqueHandle('diranon');
    const registered = await registerUser(request, {
      handle,
      email: `${handle}@openpeeps.test`,
      password: 'testtest12',
    });
    const profile = await currentProfile(request, registered.token);

    const listProfiles = async (directory: boolean) => {
      const response = await request.get(
        `/api/openpeeps/core/v1/profiles${directory ? '?directory=true' : ''}`,
      );
      expect(
        response.ok(),
        `anonymous GET /profiles${directory ? '?directory=true' : ''} failed: ${await response.text()}`,
      ).toBeTruthy();
      return (await response.json()) as { id: string; handle: string }[];
    };

    const setDiscoverable = async (discoverable: boolean) => {
      const response = await request.patch(
        '/api/openpeeps/core/v1/profiles/current',
        // updateProfileRequestSchema derives `type` from profileDataSchema.
        {
          headers: apiHeaders(registered.token),
          data: { discoverable, type: 'local' },
        },
      );
      expect(
        response.ok(),
        `PATCH /profiles/current failed: ${await response.text()}`,
      ).toBeTruthy();
    };

    // Discoverable by default, so the member shows in the anonymous directory.
    const directoryBefore = await listProfiles(true);
    expect(
      directoryBefore.some((p) => p.id === profile.id),
      'member missing from baseline anonymous directory',
    ).toBe(true);

    await setDiscoverable(false);
    try {
      // Anonymous directory hides the opted-out member ...
      const directoryAfter = await listProfiles(true);
      expect(directoryAfter.some((p) => p.id === profile.id)).toBe(false);

      // ... but the plain (picker) list still contains them.
      const plainAfter = await listProfiles(false);
      expect(plainAfter.some((p) => p.id === profile.id)).toBe(true);

      // The opt-out is directory-only: the search/mention boundary must keep
      // returning the opted-out profile, so a future "privacy fix" that adds
      // the discoverable filter to the search path fails in CI, not only in
      // the core unit suite.
      const search = await request.get(
        `/api/openpeeps/core/v1/search/profiles?q=${encodeURIComponent(handle)}`,
        { headers: apiHeaders(registered.token) },
      );
      expect(
        search.ok(),
        `GET /search/profiles?q=${handle} failed: ${await search.text()}`,
      ).toBeTruthy();
      const searchHits = (await search.json()) as Array<{
        data: { id: string };
      }>;
      expect(
        searchHits.some((hit) => hit.data.id === profile.id),
        'opted-out profile must still be returned by the search/mention boundary',
      ).toBe(true);
    } finally {
      await setDiscoverable(true);
    }
  });
});
