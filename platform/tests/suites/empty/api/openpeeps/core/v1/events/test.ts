import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  apiHeaders,
  createEvent,
  currentProfile,
  getAdminConfig,
  loginUser,
  patchAdminConfig,
  registerUser,
  uniqueHandle,
} from '../../../../../../../helpers/api';

// Black-box coverage of the ICS feed endpoints (References #408). The unit
// suites (platform/server/src/lib/__tests__/eventsIcsFeed.test.ts) mock the
// DB and auth, so nothing pins the query-param plumbing, the cache matrix
// and the token lifecycle end-to-end. CI runs the empty suite sharded — one
// community per shard — so no fixture state ever crosses tests.

const OWNER_EMAIL = 'test@test.com';
const OWNER_PASSWORD = 'testtest';

// ICS folds long lines with CRLF + space; unwrap before asserting.
const unfoldIcs = (ics: string) => ics.replace(/\r?\n[ \t]/g, '');

const feedUrl = (token?: string) =>
  `/api/openpeeps/core/v1/events/feed${token ? `?token=${token}` : ''}`;

// Public upcoming event: the only kind a guest feed can contain.
const createPublicEvent = async (
  request: APIRequestContext,
  token: string,
  name: string,
) => {
  const response = await request.post('/api/openpeeps/core/v1/posts', {
    headers: apiHeaders(token),
    data: {
      type: 'event',
      visibility: 'public',
      data: {
        type: 'event',
        name,
        content: name,
        start: new Date(Date.now() + 60_000).toISOString(),
        end: new Date(Date.now() + 3_600_000).toISOString(),
        wholeDay: false,
      },
    },
  });
  expect(
    response.ok(),
    `createPublicEvent failed: ${response.status()} ${await response.text()}`,
  ).toBeTruthy();
};

test.describe('events ICS feed', () => {
  test('guest feed is public-cachable, wrong token is 401', async ({
    request,
  }) => {
    // The admin config toggle needs the community owner (the seeded first
    // account), so the public event is created by that same account.
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const eventName = `ICS guest ${uniqueHandle('ev')}`;
    await createPublicEvent(request, ownerToken, eventName);

    // The public-cachable branch only exists when `publicContent` is on;
    // toggle it around the guest fetch like the other config-gated tests.
    const configResponse = await getAdminConfig(
      request,
      ownerToken,
      'openpeeps',
      'core',
    );
    const originalConfig = configResponse.config;
    try {
      await patchAdminConfig(request, ownerToken, 'openpeeps', 'core', {
        ...originalConfig,
        server: { ...originalConfig.server, publicContent: true },
      });

      const guest = await request.get(feedUrl());
      expect(guest.status()).toBe(200);
      // `text/calendar`, edge-cacheable, and varying on auth — a regression
      // to the personalized shape would let a private community's events be
      // served from a shared cache.
      expect(guest.headers()['content-type']).toContain('text/calendar');
      expect(guest.headers()['cache-control']).toContain('public');
      expect(guest.headers()['cache-control']).toContain('max-age=');
      expect(guest.headers()['vary']).toContain('Authorization');
      expect(guest.headers()['vary']).toContain('Cookie');
      const ics = unfoldIcs(await guest.text());
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain(`SUMMARY:${eventName}`);
    } finally {
      await patchAdminConfig(
        request,
        ownerToken,
        'openpeeps',
        'core',
        originalConfig,
      );
    }

    // A bogus token must be rejected as an empty (but valid) calendar, not
    // served from the guest path.
    const bad = await request.get(feedUrl('bogus-token-000'));
    expect(bad.status()).toBe(401);
    expect(bad.headers()['content-type']).toContain('text/calendar');
    expect(await bad.text()).toContain('BEGIN:VCALENDAR');
  });

  test('token lifecycle: mint serves the owner feed, delete stops it', async ({
    request,
  }) => {
    // Use the community owner, not a fresh member: a plain member lacks the
    // capability to create `local`-visibility posts (the `createEvent` helper
    // hardcodes `local`), which would 403 with `postCreateForbidden`.
    const { token } = await loginUser(request, OWNER_EMAIL, OWNER_PASSWORD);
    const eventName = `ICS owner ${uniqueHandle('ev')}`;
    await createEvent(request, token, eventName);

    // Mint: revoke-then-mint returns the plain token. The endpoint declares an
    // empty `z.object({})` input, so Riddl requires an explicit `{}` body —
    // a bodyless POST 400s, matching the `data: {}` convention in `gaps/test.ts`.
    const minted = await request.post(
      '/api/openpeeps/core/v1/profiles/current/calendar-feed',
      { headers: apiHeaders(token), data: {} },
    );
    expect(minted.status()).toBe(200);
    const mintedBody = (await minted.json()) as {
      success: boolean;
      token: string;
    };
    expect(mintedBody.success).toBe(true);
    expect(mintedBody.token).toMatch(/^[0-9a-f]{64}$/);
    const feedToken = mintedBody.token;

    // The token URL resolves to the owner's feed: personalized headers and
    // the owner's (local-visibility) event, without the token leaking into
    // the ICS body.
    const owned = await request.get(feedUrl(feedToken));
    expect(owned.status()).toBe(200);
    expect(owned.headers()['content-type']).toContain('text/calendar');
    expect(owned.headers()['cache-control']).toContain('private');
    // A personalized feed must not vary on auth headers — a regression to the
    // public shape would let a private community's events be served from a
    // shared cache. (The framework still emits `Vary: Origin` from CORS, so
    // assert the auth varies specifically rather than that `vary` is empty.)
    const ownedVary = owned.headers()['vary'] ?? '';
    expect(ownedVary).not.toContain('Authorization');
    expect(ownedVary).not.toContain('Cookie');
    const ics = unfoldIcs(await owned.text());
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain(`SUMMARY:${eventName}`);
    expect(ics).not.toContain(`token=${feedToken}`);

    // DELETE stops the feed resolving (same empty-body contract as the mint).
    const deleted = await request.delete(
      '/api/openpeeps/core/v1/profiles/current/calendar-feed',
      { headers: apiHeaders(token), data: {} },
    );
    expect(deleted.status()).toBe(200);
    const afterDelete = await request.get(feedUrl(feedToken));
    expect(afterDelete.status()).toBe(401);
  });

  test('profile deletion revokes the member feed token (401)', async ({
    request,
  }) => {
    // Admin deletion (`deleteProfile`) must revoke the member's feed tokens —
    // the self-service DELETE above only ever runs while the profile is
    // deletable, and `calendar_feed_tokens` has no FK to profiles, so nothing
    // cascades. Without the revocation the token URL would keep serving (as
    // an empty calendar) up to the 90-day expiry.
    const { token: ownerToken } = await loginUser(
      request,
      OWNER_EMAIL,
      OWNER_PASSWORD,
    );
    const memberHandle = uniqueHandle('ics');
    const member = await registerUser(request, {
      handle: memberHandle,
      email: `${memberHandle}@test.com`,
      password: OWNER_PASSWORD,
    });
    const memberProfile = await currentProfile(request, member.token);

    const minted = await request.post(
      '/api/openpeeps/core/v1/profiles/current/calendar-feed',
      { headers: apiHeaders(member.token), data: {} },
    );
    expect(minted.status()).toBe(200);
    const memberFeedToken = ((await minted.json()) as { token: string }).token;

    // The token resolves while the profile is alive (personalized 200, or at
    // least a valid calendar document — the membership has no events).
    const beforeDelete = await request.get(feedUrl(memberFeedToken));
    expect(beforeDelete.status()).toBe(200);

    // Admin deletion of the member profile.
    const profileDelete = await request.delete(
      `/api/openpeeps/core/v1/admin/profiles/${memberProfile.id}`,
      { headers: apiHeaders(ownerToken) },
    );
    expect(profileDelete.status()).toBe(200);

    // The token no longer resolves: the row is gone, not merely
    // expired-owner 401 — same empty-calendar contract as the wrong-token case.
    const afterDelete = await request.get(feedUrl(memberFeedToken));
    expect(afterDelete.status()).toBe(401);
    expect(afterDelete.headers()['content-type']).toContain('text/calendar');
    expect(await afterDelete.text()).toContain('BEGIN:VCALENDAR');
  });
});
