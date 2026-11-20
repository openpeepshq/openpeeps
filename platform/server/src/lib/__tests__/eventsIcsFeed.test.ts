import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@riddl/core';

// The feed handler's external deps are the token lookup, the owner-profile
// loader, the events finder and config, all mocked here. The real
// `buildEventsFeedIcs` runs unmocked so the asserted ICS is the real output.

vi.mock('@openpeepshq/core/calendarFeedTokens', () => ({
  findProfileByCalendarFeedToken: vi.fn(async () => null),
}));

vi.mock('@openpeepshq/core/posts', () => ({
  listUpcomingEventsFeed: vi.fn(async () => []),
}));

vi.mock('@openpeepshq/core/config', () => ({
  config: vi.fn(async () => ({ server: { publicContent: true } })),
  communityConfig: vi.fn(async () => ({ info: { name: 'Test Community' } })),
}));

// The token path resolves the owner through the same loader the session
// authorization middleware uses. Mock it to return a *fully-loaded* profile
// (relation arrays + type/roles), echoing the requested id — the stub the
// handler must NOT build is a bare `{ id }` with none of these.
vi.mock('#lib/auth', () => ({
  loadCurrentProfile: vi.fn(
    async (auth: { identities: { profile?: string } }) => ({
      id: auth.identities.profile,
      handle: 'owner',
      type: 'local',
      followers: [],
      following: [],
      memberships: [],
      controllers: [],
      roles: [],
    }),
  ),
  // Imported by the authorization middleware; never called on the no-auth
  // path these tests exercise, provided so the named import resolves.
  loadCurrentAccount: vi.fn(async () => undefined),
}));

// The route-registration tests load the real authorization middleware (via the
// middleware module Riddl auto-discovers), which reads the `Authorization`
// header and calls `jwt.verify`. Mock the util so a missing header yields no
// token (guest path) instead of touching the real JWT secret.
vi.mock('@openpeepshq/core/jwt', () => ({
  jwtUtil: vi.fn(async () => ({ verify: vi.fn(async () => undefined) })),
}));

import type {
  PostWithMeta,
  ProfileWithMeta,
  RSVPWithMeta,
} from '@openpeepshq/common/types';
import { EVENTS_ICS_FEED_TTL_SECONDS } from '@openpeepshq/common/lib';
import { findProfileByCalendarFeedToken } from '@openpeepshq/core/calendarFeedTokens';
import { listUpcomingEventsFeed } from '@openpeepshq/core/posts';
import { config } from '@openpeepshq/core/config';
import { loadCurrentProfile } from '#lib/auth';
import { apiEndpoint } from '../../api/openpeeps/core/v1/events/feed/GET';

const mockedToken = vi.mocked(findProfileByCalendarFeedToken);
const mockedFeed = vi.mocked(listUpcomingEventsFeed);
const mockedConfig = vi.mocked(config);
const mockedLoadProfile = vi.mocked(loadCurrentProfile);

// Reset call records (and per-test `mockResolvedValueOnce` queues) between
// tests — several assertions rely on `not.toHaveBeenCalled()`, which would
// otherwise see the previous test's calls.
beforeEach(() => {
  vi.clearAllMocks();
});

// The finder contract returns `PostWithMeta[]`, so the mock payloads are
// typed as that (the `as unknown as T` escape is the repo convention for
// fixture stubs — see common's `eventIcs.test.ts`).
const mockProfile = {
  id: 'profile1',
  handle: 'owner',
  displayName: 'Owner',
} as unknown as ProfileWithMeta;

const eventPost = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    type: 'event',
    profile: mockProfile,
    creatorId: 'profile1',
    entries: [],
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    visibility: 'public',
    group: null,
    reactions: [],
    reposts: [],
    mentions: [],
    tags: [],
    repostCount: 0,
    replyCount: 0,
    rsvps: [],
    data: {
      type: 'event',
      name: 'Demo event',
      content: '',
      start: '2026-11-20T21:00:00.000Z',
      end: '2026-11-20T22:00:00.000Z',
      wholeDay: false,
      ...extra,
    },
  }) as unknown as PostWithMeta;

// `rsvps` on `PostWithMeta` is `RSVPWithMeta[]`, so the secret-attendee
// fixture shapes a real RSVP entry (a profile, not a bare `profileId`).
const secretRsvp = {
  response: 'yes',
  profile: {
    id: 'secret-attendee',
    handle: 'secret-attendee',
  },
  createdAt: '2026-11-01T12:00:00.000Z',
} as unknown as RSVPWithMeta;

const call = (query: Record<string, unknown>, event: Record<string, unknown>) =>
  apiEndpoint.handle({ body: {}, query, param: {}, event });

const eventWith = (
  url: string,
  authData: Record<string, unknown> = { scopes: [] },
) => ({
  request: { url },
  context: { authData },
});

describe('GET /events/feed', () => {
  it('returns 401 for an unknown token', async () => {
    mockedToken.mockResolvedValueOnce(null);
    const res = await call(
      { token: 'bogus' },
      eventWith('https://example.com/api/feed?token=bogus'),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toBe(
      'text/calendar; charset=utf-8',
    );
  });

  it('returns 401 for an expired token', async () => {
    // Expiry is enforced in the token lookup (returns null once expired).
    mockedToken.mockResolvedValueOnce(null);
    const res = await call(
      { token: 'expired' },
      eventWith('https://example.com/api/feed?token=expired'),
    );
    expect(res.status).toBe(401);
  });

  it('serves the token owner feed with the community calendar name', async () => {
    mockedToken.mockResolvedValueOnce('profile1');
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    const res = await call(
      { token: 'good' },
      eventWith('https://example.com/api/feed?token=good'),
    );
    const ics = await res.text();
    expect(res.status).toBe(200);
    expect(ics).toContain('X-WR-CALNAME:Test Community');
    expect(ics).toContain('SUMMARY:Demo event');
    expect(ics).toContain('BEGIN:VCALENDAR');
    // Token responses are private and carry no Vary.
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('vary')).toBeNull();
    // The feed's ?token= secret must not leak into the ICS body.
    expect(ics).not.toContain('token=good');
  });

  it('returns 401 when the token resolves but the owner profile is gone', async () => {
    // Token resolves to an id whose profile no longer loads (deleted profile):
    // there is no live identity to attribute the feed to.
    mockedToken.mockResolvedValueOnce('profile1');
    mockedLoadProfile.mockResolvedValueOnce(undefined);
    const res = await call(
      { token: 'good' },
      eventWith('https://example.com/api/feed?token=good'),
    );
    expect(res.status).toBe(401);
    // The feed finder is never reached for an unresolvable owner.
    expect(mockedFeed).not.toHaveBeenCalled();
  });

  it('serves a public-cachable guest feed for a public community', async () => {
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    mockedConfig.mockResolvedValueOnce({ server: { publicContent: true } });
    const res = await call(
      {},
      eventWith('https://example.com/api/feed', { scopes: [] }),
    );
    expect(res.status).toBe(200);
    // The tokenless guest branch is edge-cacheable with the feed TTL and
    // varies on auth — pin the exact line so the whole cache matrix
    // (public guest / private session / private token) holds in the unit
    // suite, not just the Playwright E2E.
    expect(res.headers.get('cache-control')).toBe(
      `public, max-age=${EVENTS_ICS_FEED_TTL_SECONDS}`,
    );
    expect(res.headers.get('vary')).toBe('Authorization, Cookie');
  });

  it('serves a private guest feed when publicContent is off', async () => {
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    mockedConfig.mockResolvedValueOnce({ server: { publicContent: false } });
    const res = await call(
      {},
      eventWith('https://example.com/api/feed', { scopes: [] }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('private');
  });

  it('never exposes RSVP/attendee data in the feed', async () => {
    mockedFeed.mockResolvedValueOnce([
      {
        ...eventPost('evt1'),
        rsvps: [secretRsvp],
      },
    ]);
    const res = await call(
      {},
      eventWith('https://example.com/api/feed', { scopes: [] }),
    );
    const ics = await res.text();
    expect(ics).toContain('SUMMARY:Demo event');
    expect(ics).not.toContain('secret-attendee');
    expect(ics).not.toContain('RSVP');
  });

  it('resolves the token to a fully-loaded profile (not a bare stub) before feeding', async () => {
    // The visibility pipeline reads followers/following/memberships/type off
    // the authData profile; a `{ id }` stub both crashes it and loses the
    // owner's local/group context. Pin that the loader's full result is what
    // reaches the feed finder, with no scopes granted by a feed token.
    mockedToken.mockResolvedValueOnce('profile1');
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    const res = await call(
      { token: 'good' },
      eventWith('https://example.com/api/feed?token=good'),
    );
    expect(res.status).toBe(200);
    expect(mockedLoadProfile).toHaveBeenCalledWith({
      identities: { profile: 'profile1' },
      scopes: [],
    });
    const authData = mockedFeed.mock.calls.at(-1)?.[0];
    expect(authData?.profile?.id).toBe('profile1');
    expect(Array.isArray(authData?.profile?.followers)).toBe(true);
    expect(Array.isArray(authData?.profile?.following)).toBe(true);
    expect(Array.isArray(authData?.profile?.memberships)).toBe(true);
    expect(authData?.scopes).toEqual([]);
  });

  it('serves a session-authenticated feed as personalized (private, no Vary)', async () => {
    // The third cache branch: a session-authenticated request (a non-empty
    // `authData.profile` on the non-token path) must be treated as
    // personalized like a token response — `private, no-store`, and no `Vary`
    // (there is nothing to vary on; the response is identity-bound). A
    // regression here would let an edge cache share one member's feed.
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    const res = await call(
      {},
      eventWith('https://example.com/api/feed', {
        scopes: [],
        profile: {
          id: 'member-1',
          type: 'local',
          followers: [],
          following: [],
          memberships: [],
          controllers: [],
          roles: [],
        },
      }),
    );
    expect(res.status).toBe(200);
    const ics = await res.text();
    expect(ics).toContain('SUMMARY:Demo event');
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('vary')).toBeNull();
    // The finder ran with the session identity, not the guest empty shape.
    expect(mockedFeed.mock.calls.at(-1)?.[0]?.profile?.id).toBe('member-1');
  });
});

// Route-registration tests: drive the real riddl router + `parseQuery`, not
// `apiEndpoint.handle({ query })`. The handler tests above build
// `{ body, query, param, event }` by hand, which bypasses the query validation
// Riddl applies — that bypass is exactly why a token declared only in `Input`
// (ignored for GETs, whose keys get stripped by `parseQuery`) was invisible.
describe('route registration (real parseQuery path)', () => {
  const routePath = '/api/openpeeps/core/v1/events/feed';

  const buildApi = () =>
    api({
      routeModuleMap: {
        // The middleware module (Riddl auto-discovers `middleware.ts`) is
        // included so `event.context.authData` is populated the same way it is
        // in production — the guest/tokenless path depends on it.
        './api/middleware.ts': () =>
          Promise.resolve(import('../../api/middleware')),
        './api/openpeeps/core/v1/events/feed/GET.ts': () =>
          Promise.resolve({ apiEndpoint }),
      },
      cors: false,
      config: {
        openapi: '3.0.0',
        info: { title: 'OpenPeeps feed test', version: '1.0.0' },
      },
      onInternalError: () => {},
    });

  it('the ?token query param survives parseQuery and drives the token path', async () => {
    const openpeepsApi = await buildApi();
    mockedToken.mockResolvedValueOnce('profile1');
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    const res = await openpeepsApi.handler(
      new Request(`http://localhost${routePath}?token=good`),
    );
    expect(res.status).toBe(200);
    // Personalization (private, no Vary) proves the token reached the handler
    // and took the owner path — had it been stripped to the guest path, the
    // response would be public-cachable with a Vary header.
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('vary')).toBeNull();
    const ics = await res.text();
    expect(ics).toContain('X-WR-CALNAME:Test Community');
    expect(mockedToken).toHaveBeenCalledWith('good');
  });

  it('a tokenless request takes the guest path through the same route', async () => {
    const openpeepsApi = await buildApi();
    mockedFeed.mockResolvedValueOnce([eventPost('evt1')]);
    mockedConfig.mockResolvedValueOnce({ server: { publicContent: true } });
    const res = await openpeepsApi.handler(
      new Request(`http://localhost${routePath}`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('vary')).toBe('Authorization, Cookie');
    expect(mockedToken).not.toHaveBeenCalled();
  });
});
