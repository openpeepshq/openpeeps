import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiEndpoint } from '../GET';

const ensureLocalProfile = vi.fn();
vi.mock('#lib/auth', () => ({
  ensureLocalProfile: (...args: unknown[]) => ensureLocalProfile(...args),
}));

const findPostBySlug = vi.fn();
vi.mock('@openpeepshq/core/posts', () => ({
  findPostBySlug: (...args: unknown[]) => findPostBySlug(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const profile = (add: string[]) =>
  ({
    id: 'p1',
    handle: 'me',
    roles: add.map((cap) => ({
      id: `r-${cap}`,
      key: cap === '*' ? 'owner' : 'custom',
      capabilities: { add, remove: [] },
    })),
  }) as never;

const handle = (query: Record<string, unknown>, add: string[]) => {
  vi.mocked(ensureLocalProfile).mockResolvedValue(profile(add));
  return apiEndpoint.handle({
    body: {},
    query,
    param: {},
    event: {},
  } as never);
};

describe('GET /posts/slugs/check', () => {
  it('reports a free profile-scoped slug as available', async () => {
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(handle({ slug: 'my-article' }, ['member'])).resolves.toEqual({
      available: true,
    });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'my-article',
      'me',
      false,
      undefined,
    );
  });

  it('reports a taken profile-scoped slug as unavailable', async () => {
    vi.mocked(findPostBySlug).mockResolvedValue({ id: 'post1' } as never);
    await expect(handle({ slug: 'my-article' }, ['member'])).resolves.toEqual({
      available: false,
    });
  });

  it("reports the article's own slug as available when excludePostId is the article", async () => {
    const self = '00000000-0000-0000-0000-000000000001';
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(
      handle({ slug: 'my-article', excludePostId: self }, ['member']),
    ).resolves.toEqual({ available: true });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'my-article',
      'me',
      false,
      self,
    );
  });

  it('rejects an invalid slug shape', async () => {
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(handle({ slug: 'UPPER CASE!' }, ['member'])).resolves.toEqual({
      available: false,
    });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });

  it('flags an instance slug as requiresPermission without the capability', async () => {
    await expect(
      handle({ slug: 'a-long-instance-slug', instanceScoped: true }, [
        'member',
      ]),
    ).resolves.toEqual({ available: false, requiresPermission: true });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });

  it('lets an owner (via `*`) check the instance scope', async () => {
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(
      handle({ slug: 'a-long-instance-slug', instanceScoped: true }, ['*']),
    ).resolves.toEqual({ available: true });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'a-long-instance-slug',
      undefined,
      true,
      undefined,
    );
  });

  it('treats a handle-shaped instance slug as taken, not permission-gated', async () => {
    await expect(
      handle({ slug: 'someuser', instanceScoped: true }, ['*']),
    ).resolves.toEqual({ available: false });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });
});
