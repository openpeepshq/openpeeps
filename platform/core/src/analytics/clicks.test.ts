import { beforeEach, describe, expect, it, vi } from 'vitest';
import { database } from '../db';
import {
  normalizeClickEvent,
  normalizeLinkTarget,
  normalizePageTarget,
  recordClickEvents,
  tallyNormalizedClicks,
} from './clicks';

vi.mock('../db', () => ({
  database: vi.fn(),
}));

describe('normalizePageTarget', () => {
  it('keeps pathname only', () => {
    expect(normalizePageTarget('/groups/abc?x=1#hash')).toBe('/groups/abc');
    expect(normalizePageTarget('https://example.com/posts/1?utm=1')).toBe(
      '/posts/1',
    );
  });

  it('skips admin, api, and auth routes', () => {
    expect(normalizePageTarget('/admin')).toBeNull();
    expect(normalizePageTarget('/admin/analytics')).toBeNull();
    expect(normalizePageTarget('/api/openpeeps/core/v1/posts')).toBeNull();
    expect(normalizePageTarget('/login')).toBeNull();
    expect(normalizePageTarget('/auth/login')).toBeNull();
    expect(normalizePageTarget('/signup')).toBeNull();
  });

  it('rejects javascript and empty', () => {
    expect(normalizePageTarget('javascript:alert(1)')).toBeNull();
    expect(normalizePageTarget('')).toBeNull();
    expect(normalizePageTarget('   ')).toBeNull();
  });

  it('accepts home and member routes', () => {
    expect(normalizePageTarget('/')).toBe('/');
    expect(normalizePageTarget('/@alice')).toBe('/@alice');
    expect(normalizePageTarget('/posts/abc')).toBe('/posts/abc');
  });
});

describe('normalizeLinkTarget', () => {
  it('keeps origin + pathname with lowercase host', () => {
    expect(
      normalizeLinkTarget('https://Example.COM/path/to?utm_source=x#frag'),
    ).toBe('https://example.com/path/to');
  });

  it('rejects javascript, data, and relative hrefs', () => {
    expect(normalizeLinkTarget('javascript:alert(1)')).toBeNull();
    expect(normalizeLinkTarget('data:text/html,hi')).toBeNull();
    expect(normalizeLinkTarget('/posts/abc')).toBeNull();
    expect(normalizeLinkTarget('')).toBeNull();
  });

  it('keeps http(s) only', () => {
    expect(normalizeLinkTarget('ftp://files.example.com/a')).toBeNull();
    expect(normalizeLinkTarget('https://news.example.org/story')).toBe(
      'https://news.example.org/story',
    );
  });
});

describe('normalizeClickEvent', () => {
  it('does not treat internal paths as links', () => {
    expect(normalizeClickEvent({ kind: 'link', target: '/@alice' })).toBeNull();
    expect(normalizeClickEvent({ kind: 'page', target: '/@alice' })).toEqual({
      kind: 'page',
      target: '/@alice',
    });
  });
});

describe('tallyNormalizedClicks', () => {
  it('drops skipped events and coalesces duplicates', () => {
    expect(
      tallyNormalizedClicks([
        { kind: 'page', target: '/feed' },
        { kind: 'page', target: '/feed?tab=1' },
        { kind: 'page', target: '/admin' },
        { kind: 'link', target: 'https://example.com/a' },
        { kind: 'link', target: 'https://example.com/a?x=1' },
      ]),
    ).toEqual([
      { kind: 'page', target: '/feed', clicks: 2 },
      { kind: 'link', target: 'https://example.com/a', clicks: 2 },
    ]);
  });

  it('never includes a profile id on tallied rows', () => {
    const rows = tallyNormalizedClicks([{ kind: 'page', target: '/feed' }]);
    expect(rows[0]).toEqual({ kind: 'page', target: '/feed', clicks: 1 });
    expect(Object.keys(rows[0] ?? {})).toEqual(['kind', 'target', 'clicks']);
  });
});

describe('recordClickEvents increment', () => {
  beforeEach(() => {
    vi.mocked(database).mockReset();
  });

  it('upserts with ON CONFLICT increment and does not persist profile', async () => {
    const onConflictDoUpdate = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn(() => ({ values }));
    vi.mocked(database).mockResolvedValue({
      insert,
      select: () => ({
        from: () => ({
          where: async () => [{ n: 0 }],
        }),
      }),
    } as never);

    await recordClickEvents([
      { kind: 'page', target: '/feed' },
      { kind: 'page', target: '/feed' },
    ]);

    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith({
      day: expect.any(String),
      kind: 'page',
      target: '/feed',
      clicks: 2,
    });
    const inserted = values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted).not.toHaveProperty('profileId');
    expect(inserted).not.toHaveProperty('profile_id');
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ clicks: expect.anything() }),
      }),
    );
  });
});
