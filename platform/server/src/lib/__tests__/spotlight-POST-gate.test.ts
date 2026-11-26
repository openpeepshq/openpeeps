import { beforeEach, describe, expect, it, vi } from 'vitest';

// Real-gate test for the spotlight endpoint: `#lib/auth` is NOT mocked
// (except `ensureLocalProfile`, which resolves the caller's identity), so
// the real `ensureJamModeration` runs — `canModerateJam`, `ensureAccess`
// and `checkPostCapabilities` are all unmocked. This pins the regression
// the mocked endpoint test cannot see (round-4 review, suggestion 2):
// `ensurePostCapabilities` early-returns for public jams, so a public jam
// must still 403 a non-moderator through the real gate, and a co-moderator
// must pass it.
//
// `@openpeepshq/core/config` and `@openpeepshq/core/stripe` are the only
// DB-bound dependencies of the real gate; both are mocked so the suite
// stays a unit test (no Postgres/Redis).
vi.mock('#lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#lib/auth')>()),
  // Literal on purpose: `vi.mock` factories are hoisted above the
  // `OUTSIDER_ID` const declaration below.
  ensureLocalProfile: vi.fn(async () => ({
    id: '01970000-0000-7000-8000-000000000004',
  })),
}));

const { findJamEvent, setJamSpotlight } = vi.hoisted(() => ({
  findJamEvent: vi.fn(),
  setJamSpotlight: vi.fn(async () => ({ success: true })),
}));

vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent,
  setJamSpotlight,
}));

vi.mock('@openpeepshq/core/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openpeepshq/core/config')>()),
  capabilitiesConfig: vi.fn(async () => ({
    post: {},
    profile: {},
    report: {},
    accessToken: {},
  })),
  config: vi.fn(async () => ({ server: { publicContent: false } })),
}));

vi.mock('@openpeepshq/core/stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openpeepshq/core/stripe')>()),
  stripeMembershipActive: vi.fn(async () => false),
}));

import { apiEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/spotlight/POST';

const CREATOR_ID = '01970000-0000-7000-8000-000000000001';
const MODERATOR_ID = '01970000-0000-7000-8000-000000000002';
const SPOTLIT_ID = '01970000-0000-7000-8000-000000000003';
const OUTSIDER_ID = '01970000-0000-7000-8000-000000000004';

// `public` + `data.jam`: the exact shape `ensurePostCapabilities` would
// early-return on (the regression this file pins).
const publicJam = () => ({
  id: 'jam-1',
  type: 'post',
  visibility: 'public',
  profile: { id: CREATOR_ID },
  data: {
    type: 'event',
    jam: {
      id: 'jam-1',
      moderators: [CREATOR_ID, MODERATOR_ID],
    },
  },
});

const eventFor = (profile: Record<string, unknown>) =>
  ({
    context: {
      currentProfile: { id: profile.id, type: 'local' },
      authData: {
        profile,
        scopes: [{ scopeLevel: 'admin', resource: { type: 'posts', id: '*' } }],
      },
    },
  }) as unknown as Parameters<
    typeof import('#lib/auth').ensureJamModeration
  >[0];

const outsider = () => ({
  id: OUTSIDER_ID,
  followers: [],
  following: [],
  roles: [{ name: 'local', capabilities: { add: ['core-local'], remove: [] } }],
});

const moderator = () => ({
  ...outsider(),
  roles: [
    {
      name: 'moderator',
      capabilities: {
        add: ['core-local', 'core-posts-jam-moderate'],
        remove: [],
      },
    },
  ],
});

const call = (profile: Record<string, unknown>) =>
  (apiEndpoint.handle as (args: Record<string, unknown>) => Promise<unknown>)({
    body: { identity: SPOTLIT_ID },
    query: {},
    param: { eventId: 'jam-1' },
    event: eventFor(profile),
  });

describe('jams spotlight POST endpoint — real gate (#2206)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findJamEvent.mockResolvedValue(publicJam());
  });

  it('403s a non-moderator on a public jam', async () => {
    await expect(call(outsider())).rejects.toMatchObject({ status: 403 });
    expect(setJamSpotlight).not.toHaveBeenCalled();
  });

  it('lets the creator write on a public jam', async () => {
    const creatorProfile = { ...outsider(), id: CREATOR_ID };
    await expect(call(creatorProfile)).resolves.toEqual({ success: true });
    expect(setJamSpotlight).toHaveBeenCalledWith(
      publicJam(),
      SPOTLIT_ID,
      undefined,
    );
  });

  it('lets a co-moderator write on a public jam', async () => {
    const coModerator = { ...outsider(), id: MODERATOR_ID };
    await expect(call(coModerator)).resolves.toEqual({ success: true });
    expect(setJamSpotlight).toHaveBeenCalledWith(
      publicJam(),
      SPOTLIT_ID,
      undefined,
    );
  });

  it('lets a `core-posts-jam-moderate` holder write on a non-public jam', async () => {
    const localJam = { ...publicJam(), visibility: 'local' };
    findJamEvent.mockResolvedValue(localJam);
    await expect(call(moderator())).resolves.toEqual({ success: true });
    expect(setJamSpotlight).toHaveBeenCalledWith(
      localJam,
      SPOTLIT_ID,
      undefined,
    );
  });

  it('403s a local-but-unmoderated profile on a non-public jam', async () => {
    const localJam = { ...publicJam(), visibility: 'local' };
    findJamEvent.mockResolvedValue(localJam);
    await expect(call(outsider())).rejects.toMatchObject({ status: 403 });
    expect(setJamSpotlight).not.toHaveBeenCalled();
  });
});
