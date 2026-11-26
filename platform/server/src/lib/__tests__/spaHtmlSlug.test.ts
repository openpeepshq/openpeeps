import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findPostBySlug, canReadPost, capabilitiesConfig } = vi.hoisted(() => ({
  findPostBySlug: vi.fn(),
  // canReadPost(config, authData) → (post) => boolean
  canReadPost: vi.fn(),
  capabilitiesConfig: vi.fn(),
}));

vi.mock('@openpeepshq/core/posts', () => ({
  findPostBySlug,
  canReadPost,
}));
vi.mock('@openpeepshq/core/config', () => ({
  capabilitiesConfig,
}));

import { slugCanonicalRedirect } from '../spaHtml';

/** A readable public article the slug resolves to. */
const post: { id: string } & Record<string, unknown> = {
  id: '00000000-0000-1000-8000-000000000002',
  type: 'article',
  profile: { id: '00000000-0000-1000-8000-000000000001', handle: 'author' },
  creatorId: '00000000-0000-1000-8000-000000000001',
  data: { type: 'article', title: 'My post', content: 'Body' },
  entries: [],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  reactions: [],
  reposts: [],
  mentions: [],
  tags: [],
  rsvps: [],
  group: null,
  accountInteractions: {
    favorited: false,
    reposted: false,
    muted: false,
    bookmarked: false,
    pinned: false,
  },
};

beforeEach(() => {
  vi.mocked(findPostBySlug).mockReset();
  vi.mocked(canReadPost).mockReset();
});

describe('slugCanonicalRedirect', () => {
  it('301s a resolvable instance slug to its canonical /posts/:id', async () => {
    // A >16-char slug is not handle-shaped, so `/{slug}` parses as an
    // instance-scoped slug (a ≤16-char segment would be a profile route).
    findPostBySlug.mockResolvedValue(post);
    canReadPost.mockReturnValue(() => true);
    await expect(
      slugCanonicalRedirect('/my-long-instance-slug', {
        indexProfiles: true,
      }),
    ).resolves.toBe('/posts/00000000-0000-1000-8000-000000000002');
    // Looked up instance-scoped, no handle.
    expect(findPostBySlug).toHaveBeenCalledWith(
      'my-long-instance-slug',
      undefined,
      true,
    );
  });

  it('301s a resolvable profile slug to its canonical /posts/:id', async () => {
    findPostBySlug.mockResolvedValue(post);
    canReadPost.mockReturnValue(() => true);
    await expect(
      slugCanonicalRedirect('/alice/first-post', { indexProfiles: true }),
    ).resolves.toBe('/posts/00000000-0000-1000-8000-000000000002');
    // Profile-scoped: handle + slug, not instance-scoped.
    expect(findPostBySlug).toHaveBeenCalledWith('first-post', 'alice', false);
  });

  it('falls through to the shell (null) for a slug that resolves to no post', async () => {
    findPostBySlug.mockResolvedValue(null);
    canReadPost.mockReturnValue(() => true);
    await expect(
      slugCanonicalRedirect('/alice/missing-post', { indexProfiles: true }),
    ).resolves.toBeNull();
  });

  it('never redirects an unreadable (group/private) article and does not leak its post id', async () => {
    // The article exists, but the anonymous read rule rejects it. The redirect
    // must be null — not a `/posts/:id` that would disclose the id to a viewer
    // (or crawler) who cannot read it.
    findPostBySlug.mockResolvedValue(post);
    canReadPost.mockReturnValue(() => false);
    const result = await slugCanonicalRedirect('/alice/first-post', {
      indexProfiles: true,
    });
    expect(result).toBeNull();
    expect(String(result)).not.toContain(post.id);
  });

  it('returns null for a reserved top-level path (never a slug)', async () => {
    // `/articles/x` is a reserved app route, not a slug — no post lookup, no
    // redirect.
    findPostBySlug.mockResolvedValue(post);
    canReadPost.mockReturnValue(() => true);
    await expect(
      slugCanonicalRedirect('/articles/x', { indexProfiles: true }),
    ).resolves.toBeNull();
    expect(findPostBySlug).not.toHaveBeenCalled();
  });
});
