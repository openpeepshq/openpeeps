import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PREPENDED_SCORE } from '@openpeepshq/core/search';

const h = vi.hoisted(() => ({
  searchProfiles: vi.fn(
    async () =>
      [] as Array<{
        score: number;
        data: { handle: string; activityPub?: { domain: string } };
      }>,
  ),
  isRemoteIdentityQuery: vi.fn(
    (q: string) =>
      q.includes('@') && q.slice(q.lastIndexOf('@') + 1).includes('.'),
  ),
  resolveRemoteIdentity: vi.fn(async () => undefined as unknown),
  ensureLocalProfile: vi.fn(async () => undefined),
  fedifyRemoteIdentityFetcher: vi.fn(),
}));

vi.mock('#lib/auth', () => ({
  ensureLocalProfile: h.ensureLocalProfile,
}));
vi.mock('@openpeepshq/core/search', async (importOriginal) => {
  // `PREPENDED_SCORE` is a plain constant (not a vi.fn) — pull it from the
  // real module so the test asserts against the actual sentinel value.
  const actual =
    await importOriginal<typeof import('@openpeepshq/core/search')>();
  return {
    ...actual,
    searchProfiles: h.searchProfiles,
    isRemoteIdentityQuery: h.isRemoteIdentityQuery,
    resolveRemoteIdentity: h.resolveRemoteIdentity,
  };
});
vi.mock('#lib/remoteIdentityFetch', () => ({
  fedifyRemoteIdentityFetcher: h.fedifyRemoteIdentityFetcher,
}));

import { apiEndpoint } from './GET';
beforeEach(() => {
  h.searchProfiles.mockReset().mockResolvedValue([]);
  h.resolveRemoteIdentity.mockReset().mockResolvedValue(undefined);
});

const event = { context: { authData: { profileId: 'p-1' } } };
const call = (query: Record<string, unknown>) =>
  apiEndpoint.handle({ body: {}, query, param: {}, event });

const remoteProfile = {
  id: 'a0000000-0000-4000-8000-000000000000',
  handle: 'alice',
  activityPub: { domain: 'mastodon.social' },
};

describe('GET /search/profiles remote-identity resolution', () => {
  it('resolves a remote identity and prepends the profile on the first page', async () => {
    h.searchProfiles.mockResolvedValueOnce([]);
    h.resolveRemoteIdentity.mockResolvedValueOnce(remoteProfile);

    const result = (await call({ q: '@alice@mastodon.social' })) as Array<{
      score: number;
      data: unknown;
    }>;

    expect(h.resolveRemoteIdentity).toHaveBeenCalledTimes(1);
    expect(h.resolveRemoteIdentity).toHaveBeenCalledWith(
      '@alice@mastodon.social',
      h.fedifyRemoteIdentityFetcher,
    );
    expect(result).toEqual([{ score: PREPENDED_SCORE, data: remoteProfile }]);
  });

  it('prepends with a finite score that survives JSON serialization', async () => {
    // Regression: `Infinity` as the sentinel outranked every `ts_rank` score
    // but failed riddl's output validation (`score: z.number()` rejects
    // `Infinity`) and rendered as `null` in the serialized payload. The
    // prepended score must stay first *and* be a JSON-representable number.
    h.searchProfiles.mockResolvedValueOnce([
      { score: 0.99, data: { handle: 'a' } },
    ]);
    h.resolveRemoteIdentity.mockResolvedValueOnce(remoteProfile);

    const result = (await call({ q: '@alice@mastodon.social' })) as Array<{
      score: number;
      data: unknown;
    }>;

    const [first] = result;
    expect(Number.isFinite(first.score)).toBe(true);
    expect(first.score).toBe(PREPENDED_SCORE);
    expect(first.score).toBeGreaterThan(0.99);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('does not duplicate a remote profile already returned by the index', async () => {
    h.searchProfiles.mockResolvedValueOnce([
      {
        score: 5,
        data: {
          handle: 'alice',
          activityPub: { domain: 'mastodon.social' },
        },
      },
    ]);
    h.resolveRemoteIdentity.mockResolvedValueOnce(remoteProfile);

    const result = (await call({ q: '@alice@mastodon.social' })) as Array<{
      score: number;
      data: { handle: string };
    }>;

    expect(result).toEqual([
      {
        score: 5,
        data: { handle: 'alice', activityPub: { domain: 'mastodon.social' } },
      },
    ]);
  });

  it('still prepends when a local profile shares the bare handle (different domain)', async () => {
    h.searchProfiles.mockResolvedValueOnce([
      { score: 5, data: { handle: 'alice' } },
    ]);
    h.resolveRemoteIdentity.mockResolvedValueOnce(remoteProfile);

    const result = (await call({ q: '@alice@mastodon.social' })) as Array<{
      score: number;
      data: { handle: string };
    }>;

    expect(result).toEqual([
      { score: PREPENDED_SCORE, data: remoteProfile },
      { score: 5, data: { handle: 'alice' } },
    ]);
  });

  it('skips resolution for a local query', async () => {
    h.searchProfiles.mockResolvedValueOnce([
      { score: 1, data: { handle: 'bob' } },
    ]);

    await call({ q: 'bob' });

    expect(h.isRemoteIdentityQuery).toHaveBeenCalled();
    expect(h.resolveRemoteIdentity).not.toHaveBeenCalled();
  });

  it('skips resolution past the first page', async () => {
    h.searchProfiles.mockResolvedValueOnce([]);

    await call({ q: '@alice@mastodon.social', offset: 15 });

    expect(h.resolveRemoteIdentity).not.toHaveBeenCalled();
  });

  it('still returns local results when resolution finds nothing', async () => {
    h.searchProfiles.mockResolvedValueOnce([
      { score: 1, data: { handle: 'bob' } },
    ]);
    h.resolveRemoteIdentity.mockResolvedValueOnce(undefined);

    const result = (await call({ q: '@alice@mastodon.social' })) as Array<{
      data: { handle: string };
    }>;

    expect(result).toEqual([{ score: 1, data: { handle: 'bob' } }]);
  });
});
