import { beforeEach, describe, expect, it, vi } from 'vitest';

// Tests for the calendar-feed token endpoints — the feature's only write
// surface. The auth guard is mocked out (it throws `authNeeded`, which the
// riddl router translates to a 401; the unauthenticated tests pin that the
// guard is actually hit). Everything downstream runs unmocked, including the
// real `tokenResponseSchema`/`successResponseSchema` on `Output`.

vi.mock('@openpeepshq/core/calendarFeedTokens', () => ({
  createCalendarFeedToken: vi.fn(),
  revokeAllCalendarFeedTokens: vi.fn(),
}));

vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(),
}));

import {
  createCalendarFeedToken,
  revokeAllCalendarFeedTokens,
} from '@openpeepshq/core/calendarFeedTokens';
import {
  successResponseSchema,
  tokenResponseSchema,
  type ProfileWithMeta,
} from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { apiEndpoint as postCalendarFeed } from '../../api/openpeeps/core/v1/profiles/current/calendar-feed/POST';
import { apiEndpoint as deleteCalendarFeed } from '../../api/openpeeps/core/v1/profiles/current/calendar-feed/DELETE';

const mockedCreate = vi.mocked(createCalendarFeedToken);
const mockedRevoke = vi.mocked(revokeAllCalendarFeedTokens);
const mockedEnsureProfile = vi.mocked(ensureLocalProfile);

// `ensureLocalProfile` resolves to `ProfileWithMeta`, so the stub is typed as
// that instead of `as never` (fixture stubs use the repo's `as unknown as T`
// escape for the parts a test doesn't exercise).
const ownerProfile = {
  id: 'profile-1',
  type: 'local',
  handle: 'owner',
  roles: [],
  followers: [],
  following: [],
  memberships: [],
  controllers: [],
} as unknown as ProfileWithMeta;

// Mirrors the shape the riddl router passes to a handler: body/query/param
// merged into `input`, `event` carrying the request + auth context.
const call = (event: Record<string, unknown> = { context: {} }) =>
  postCalendarFeed.handle({
    body: {},
    query: {},
    param: {},
    event,
  }) as Promise<{ success: boolean; token: string }>;
const callDelete = (event: Record<string, unknown> = { context: {} }) =>
  deleteCalendarFeed.handle({
    body: {},
    query: {},
    param: {},
    event,
  }) as Promise<{ success: boolean }>;

const unauthenticatedEvent = {
  request: { url: 'https://example.com/api/profiles/current/calendar-feed' },
  context: {},
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /profiles/current/calendar-feed', () => {
  it('requires a local profile (unauthenticated requests hit the 401 guard)', async () => {
    mockedEnsureProfile.mockRejectedValueOnce(
      Object.assign(new Error('Authentication needed'), {
        __HTTP_ERROR__: true,
        status: 401,
      }),
    );
    await expect(call(unauthenticatedEvent)).rejects.toMatchObject({
      status: 401,
    });
    expect(mockedEnsureProfile).toHaveBeenCalledWith(unauthenticatedEvent);
    expect(mockedRevoke).not.toHaveBeenCalled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('revokes every pre-existing token, then returns a fresh 32-byte-hex token', async () => {
    mockedEnsureProfile.mockResolvedValueOnce(ownerProfile);
    mockedRevoke.mockResolvedValueOnce(2); // two stale tokens go away
    mockedCreate.mockResolvedValueOnce({
      plainToken: 'a'.repeat(64),
      tokenId: 'row-1',
    });

    const body = await call({
      request: {
        url: 'https://example.com/api/profiles/current/calendar-feed',
      },
      context: { currentProfile: ownerProfile },
    });

    // Reset semantics: revocation happens *before* the mint, for the
    // authenticated profile — this is the "old subscriber URLs stop working"
    // security property.
    expect(mockedRevoke).toHaveBeenCalledTimes(1);
    expect(mockedRevoke).toHaveBeenCalledWith('profile-1');
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledWith('profile-1');

    // The response is the plain token (the hash is never returned) and
    // validates against the endpoint's `Output` schema.
    expect(body).toEqual({ success: true, token: 'a'.repeat(64) });
    expect(body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenResponseSchema.safeParse(body).success).toBe(true);
  });
});

describe('DELETE /profiles/current/calendar-feed', () => {
  it('requires a local profile (unauthenticated requests hit the 401 guard)', async () => {
    mockedEnsureProfile.mockRejectedValueOnce(
      Object.assign(new Error('Authentication needed'), {
        __HTTP_ERROR__: true,
        status: 401,
      }),
    );
    await expect(callDelete(unauthenticatedEvent)).rejects.toMatchObject({
      status: 401,
    });
    expect(mockedEnsureProfile).toHaveBeenCalledWith(unauthenticatedEvent);
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it('revokes all tokens for the profile', async () => {
    mockedEnsureProfile.mockResolvedValueOnce(ownerProfile);
    mockedRevoke.mockResolvedValueOnce(1);

    const body = await callDelete({
      request: {
        url: 'https://example.com/api/profiles/current/calendar-feed',
      },
      context: { currentProfile: ownerProfile },
    });

    expect(mockedRevoke).toHaveBeenCalledTimes(1);
    expect(mockedRevoke).toHaveBeenCalledWith('profile-1');
    expect(body).toEqual({ success: true });
    expect(successResponseSchema.safeParse(body).success).toBe(true);
  });
});
