import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PostWithMeta,
  ProfileWithMeta,
  PublicPost,
  Scope,
} from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { findPost, publishPost } from '@openpeepshq/core/posts';
import { apiEndpoint } from '../../api/openpeeps/core/v1/posts/[postId]/publish/POST';

// Route-level pins for the draft publish denial layering (#382). The real
// `#lib/auth` capability stack (`ensureLocalProfile` → `ensureAccess` →
// `checkPostCapabilities`) runs unmocked against the default capabilities
// config; only the DB-bound helpers are mocked. `findPost` is mocked because
// the by-id finder does not apply the published-only default filter (drafts
// reach the capability gate), so the gate — not `findPost` — is the denial
// point for non-creators.
vi.mock('@openpeepshq/core/posts', () => ({
  findPost: vi.fn(),
  publishPost: vi.fn(),
}));

vi.mock('@openpeepshq/core/config', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/core/config')>();
  // `capabilitiesConfig()` resolves the registered schema defaults when no
  // DB config is present, so delegating to the real loader yields the actual
  // default capabilities without needing a database.
  return {
    ...actual,
    config: vi.fn(async () => ({ server: { publicContent: false } })),
    capabilitiesConfig: vi.fn(() => actual.capabilitiesConfig()),
  };
});

vi.mock('@openpeepshq/core/stripe', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/core/stripe')>();
  return { ...actual, checkSubscription: vi.fn(async () => true) };
});

const CREATOR_ID = 'creator-1';

// A logged-in profile token carries an admin scope over `*` (see
// `createSignedProfileAccessToken`'s default); `fullScopes` mirrors that.
const fullScopes: Scope[] = [
  { scopeLevel: 'admin', resource: { type: '*', id: '*' } },
];

const localProfile = (id: string): ProfileWithMeta =>
  ({
    id,
    type: 'local',
    roles: [],
    followers: [],
    following: [],
    blockingIds: [],
    blockedByIds: [],
    controllers: [],
  }) as unknown as ProfileWithMeta;

const postBase = {
  id: 'post-1',
  type: 'note',
  visibility: 'public',
  data: { type: 'note' },
  profile: { id: CREATOR_ID },
  creatorId: CREATOR_ID,
  group: undefined,
  audience: [],
  mentions: [],
  entries: [],
  tags: [],
  reactions: [],
  reposts: [],
  rsvps: [],
  replyCount: 0,
  repostCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as PublicPost;

const draft = {
  ...postBase,
  isDraft: true,
  publishedAt: null,
} as unknown as PostWithMeta;
const published = {
  ...postBase,
  isDraft: false,
  publishedAt: '2026-01-02T00:00:00.000Z',
} as unknown as PostWithMeta;

const eventFor = (profile: ProfileWithMeta, scopes: Scope[]) =>
  ({
    context: {
      authData: { profile, scopes },
      currentProfile: profile,
      currentAccount: undefined,
      authorization: { identities: { profile: profile.id }, scopes },
    },
  }) as unknown as RequestEvent;

const run = (profile: ProfileWithMeta, scopes: Scope[]) =>
  apiEndpoint.handle({
    body: {},
    query: {},
    param: { postId: 'post-1' },
    event: eventFor(profile, scopes),
  });

const caught = async (p: Promise<unknown>) =>
  (await p.catch((error: unknown) => error)) as Record<string, unknown>;

describe('POST /posts/[postId]/publish (#382 draft publish denial layering)', () => {
  beforeEach(() => {
    vi.mocked(findPost).mockReset();
    vi.mocked(publishPost).mockReset();
  });

  it('404s when the post does not exist', async () => {
    vi.mocked(findPost).mockResolvedValue(undefined);
    const err = await caught(run(localProfile(CREATOR_ID), fullScopes));
    expect(err).toMatchObject({ __HTTP_ERROR__: true, status: 404 });
    expect(vi.mocked(publishPost)).not.toHaveBeenCalled();
  });

  it('403s a non-creator at the capability gate (drafts grant caps via the profile self relationship only)', async () => {
    vi.mocked(findPost).mockResolvedValue(draft);
    const err = await caught(run(localProfile('other-1'), fullScopes));
    expect(err).toMatchObject({ __HTTP_ERROR__: true, status: 403 });
    expect(String(err.message)).toBe('Missing capabilities: core-posts-update');
    expect(vi.mocked(publishPost)).not.toHaveBeenCalled();
  });

  it('403s the creator with a scope-less token (capability present via self, but the write scope gate fails)', async () => {
    vi.mocked(findPost).mockResolvedValue(draft);
    const err = await caught(run(localProfile(CREATOR_ID), []));
    expect(err).toMatchObject({ __HTTP_ERROR__: true, status: 403 });
    expect(vi.mocked(publishPost)).not.toHaveBeenCalled();
  });

  it('403s a non-creator on an already-published post too', async () => {
    vi.mocked(findPost).mockResolvedValue(published);
    const err = await caught(run(localProfile('other-1'), fullScopes));
    expect(err).toMatchObject({ __HTTP_ERROR__: true, status: 403 });
    expect(vi.mocked(publishPost)).not.toHaveBeenCalled();
  });

  it('maps publishPost core errors to their HTTP status (already-published → 422 error.alreadyPublished)', async () => {
    const creator = localProfile(CREATOR_ID);
    vi.mocked(findPost).mockResolvedValue(published);
    vi.mocked(publishPost).mockRejectedValue({
      __allPeepError__: true,
      code: 422,
      errorKey: 'error.alreadyPublished',
    } as never);
    const err = await caught(run(creator, fullScopes));
    // Without `.catch(rethrowIfOpenpeepsError)` this would be the raw core
    // error (no `__HTTP_ERROR__`) and Riddl would answer 500.
    expect(err).toMatchObject({
      __HTTP_ERROR__: true,
      status: 422,
      key: 'error.alreadyPublished',
    });
    expect(vi.mocked(publishPost)).toHaveBeenCalledWith(published, creator);
  });

  it('publishes the draft for the author (happy path)', async () => {
    const creator = localProfile(CREATOR_ID);
    vi.mocked(findPost).mockResolvedValue(draft);
    const publishedCopy = { ...published };
    vi.mocked(publishPost).mockResolvedValue(publishedCopy);
    const res = await run(creator, fullScopes);
    expect(res).toBe(publishedCopy);
    expect(vi.mocked(publishPost)).toHaveBeenCalledWith(draft, creator);
  });
});
