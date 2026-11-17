import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';

const { communityConfig, spaMetaForPath } = vi.hoisted(() => ({
  communityConfig: vi.fn(),
  spaMetaForPath: vi.fn(),
}));

vi.mock('@openpeepshq/core/config', () => ({ communityConfig }));
vi.mock('@openpeepshq/core/seo', () => ({ spaMetaForPath }));
vi.mock('@openpeepshq/core/redis', () => ({
  getSharedConnection: vi.fn(async () => ({})),
}));
vi.mock('./seo', () => ({ robotsTxt: vi.fn(), sitemapXml: vi.fn() }));

import { spaMetaForRequest } from '../seoEndpoint';

const request = (originalUrl = '/posts/abc'): Request =>
  ({ originalUrl }) as unknown as Request;

beforeEach(() => {
  vi.mocked(communityConfig).mockReset();
  vi.mocked(spaMetaForPath).mockReset();
});

describe('spaMetaForRequest', () => {
  it('passes the community indexProfiles flag into the path lookup', async () => {
    vi.mocked(communityConfig).mockResolvedValue({
      settings: { indexProfiles: true },
    });
    vi.mocked(spaMetaForPath).mockResolvedValue({
      meta: { title: 'On echoes', description: 'A reflection on sound.' },
    });
    const result = await spaMetaForRequest(request('/posts/abc'));
    expect(result).toEqual({
      meta: { title: 'On echoes', description: 'A reflection on sound.' },
    });
    expect(vi.mocked(spaMetaForPath)).toHaveBeenCalledWith('/posts/abc', {
      indexProfiles: true,
    });
  });

  it('returns a null meta for an unreadable local post on a private community', async () => {
    vi.mocked(communityConfig).mockResolvedValue({
      settings: { indexProfiles: false },
    });
    vi.mocked(spaMetaForPath).mockResolvedValue({ meta: null });
    const result = await spaMetaForRequest(request('/posts/abc'));
    expect(result).toEqual({ meta: null });
    expect(vi.mocked(spaMetaForPath)).toHaveBeenCalledWith('/posts/abc', {
      indexProfiles: false,
    });
  });

  it('returns a null meta for an unknown id without raising the status code', async () => {
    vi.mocked(communityConfig).mockResolvedValue({});
    vi.mocked(spaMetaForPath).mockResolvedValue({ meta: null });
    const result = await spaMetaForRequest(request('/posts/does-not-exist'));
    expect(result).toEqual({ meta: null });
  });

  it('degrades to a null meta when the lookup throws, instead of erroring the route', async () => {
    vi.mocked(communityConfig).mockRejectedValue(new Error('redis down'));
    const result = await spaMetaForRequest(request('/posts/abc'));
    expect(result).toEqual({ meta: null });
  });

  it('splits the query string off before resolving the path', async () => {
    vi.mocked(communityConfig).mockResolvedValue({});
    vi.mocked(spaMetaForPath).mockResolvedValue({ meta: null });
    await spaMetaForRequest(request('/posts/abc?reply=1'));
    expect(vi.mocked(spaMetaForPath)).toHaveBeenCalledWith('/posts/abc', {
      indexProfiles: false,
    });
  });
});
