import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiEndpoint } from '../POST';

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

const handle = (input: Record<string, unknown>, add: string[]) => {
  vi.mocked(ensureLocalProfile).mockResolvedValue(profile(add));
  return apiEndpoint.handle({
    body: input,
    query: {},
    param: {},
    event: {},
  } as never);
};

describe('POST /posts/slugs/generate', () => {
  it('generates a free profile-scoped slug from the title', async () => {
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(
      handle({ title: 'My Great Article' }, ['member']),
    ).resolves.toEqual({ slug: 'my-great-article' });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'my-great-article',
      'me',
      false,
      undefined,
    );
  });

  it('appends a conflict suffix when the base slug is taken', async () => {
    vi.mocked(findPostBySlug).mockImplementation((slug: string) =>
      Promise.resolve(slug === 'my-great-article' ? { id: 'x' } : null),
    );
    await expect(
      handle({ title: 'My Great Article' }, ['member']),
    ).resolves.toEqual({ slug: 'my-great-article-2' });
  });

  it("passes excludePostId through so the article's own slug is not a collision", async () => {
    const self = '00000000-0000-0000-0000-000000000001';
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(
      handle({ title: 'My Great Article', excludePostId: self }, ['member']),
    ).resolves.toEqual({ slug: 'my-great-article' });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'my-great-article',
      'me',
      false,
      self,
    );
  });

  it('forbids instance-scoped generation without the capability', async () => {
    await expect(
      handle({ title: 'My Great Article', instanceScoped: true }, ['member']),
    ).rejects.toMatchObject({ status: 403 });
    expect(findPostBySlug).not.toHaveBeenCalled();
  });

  it('lets an owner generate an instance-scoped slug', async () => {
    vi.mocked(findPostBySlug).mockResolvedValue(null);
    await expect(
      handle({ title: 'A new great article', instanceScoped: true }, ['*']),
    ).resolves.toEqual({ slug: 'a-new-great-article' });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'a-new-great-article',
      undefined,
      true,
      undefined,
    );
  });

  it('returns null (not 403) when an instance-scoped generation finds nothing free', async () => {
    // The title slugifies to a handle-shaped slug, which is not a resolvable
    // `/{slug}` — that is "nothing generated", not a permission failure.
    await expect(
      handle({ title: 'someuser', instanceScoped: true }, ['*']),
    ).resolves.toEqual({ slug: null });
  });
});
