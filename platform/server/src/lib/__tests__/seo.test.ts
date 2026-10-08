import { describe, expect, it } from 'vitest';
import { jsonLdForPage, robotsTxt, sitemapXml } from '../seo';

describe('robotsTxt', () => {
  it('points crawlers at the sitemap on a public community', () => {
    const robots = robotsTxt('https://echo.example/', true);
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/echo\.example\/sitemap\.xml$/m);
    expect(robots).not.toContain('example//');
  });

  it('keeps logged-out surfaces out of the index', () => {
    const robots = robotsTxt('https://echo.example', true);
    for (const path of [
      '/admin',
      '/settings',
      '/conversations',
      '/notifications',
      '/auth',
      '/feeds',
    ]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });

  it('turns every crawler away when the community is private', () => {
    expect(robotsTxt('https://echo.example', false)).toBe(
      'User-agent: *\nDisallow: /\n',
    );
  });
});

describe('sitemapXml', () => {
  it('escapes paths and emits date-only lastmod', () => {
    const xml = sitemapXml('https://echo.example', [
      { path: '/posts/a&b', updatedAt: '2026-03-04T05:06:07.000Z' },
    ]);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n/);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain('<loc>https://echo.example/posts/a&amp;b</loc>');
    expect(xml).toContain('<lastmod>2026-03-04</lastmod>');
  });

  it('omits lastmod when an entry has no timestamp', () => {
    const xml = sitemapXml('https://echo.example', [{ path: '/groups/x' }]);
    expect(xml).toContain('<loc>https://echo.example/groups/x</loc></url>');
  });

  it('drops an unparseable timestamp instead of emitting Invalid Date', () => {
    const xml = sitemapXml('https://echo.example', [
      { path: '/posts/x', updatedAt: 'soon' },
    ]);
    expect(xml).toContain('<loc>https://echo.example/posts/x</loc></url>');
    expect(xml).not.toContain('Invalid');
  });

  it('escapes quotes and stays well-formed with no entries', () => {
    expect(
      sitemapXml('https://echo.example', [{ path: '/groups/a"b' }]),
    ).toContain('/groups/a&quot;b</loc>');
    const empty = sitemapXml('https://echo.example', []);
    expect(empty).toContain('<urlset xmlns=');
    expect(empty.trim().endsWith('</urlset>')).toBe(true);
  });
});

describe('jsonLdForPage', () => {
  const postMeta = {
    title: 'How we shipped',
    description: 'The full story.',
    kind: 'post' as const,
    datePublished: '2026-03-04T05:06:07.000Z',
    dateModified: '2026-03-05T05:06:07.000Z',
    authorName: '@seotester',
  };

  it('describes a post page as a DiscussionForumPosting', () => {
    const ld = JSON.parse(
      jsonLdForPage(
        'https://echo.example',
        'https://echo.example/posts/abc',
        '/posts/abc',
        postMeta,
        'Echo Community',
      ),
    );
    expect(ld['@type']).toBe('DiscussionForumPosting');
    expect(ld.headline).toBe('How we shipped');
    expect(ld.datePublished).toBe('2026-03-04T05:06:07.000Z');
    expect(ld.author).toEqual({ '@type': 'Person', name: '@seotester' });
    expect(ld.url).toBe('https://echo.example/posts/abc');
    expect(ld.isPartOf.url).toBe('https://echo.example/');
  });

  it('escapes a script-closing title instead of breaking out of the tag', () => {
    const raw = jsonLdForPage(
      'https://echo.example',
      'https://echo.example/posts/abc',
      '/posts/abc',
      { ...postMeta, title: '</script><b>x</b>' },
      'Echo Community',
    );
    expect(raw).not.toContain('</script>');
    expect(JSON.parse(raw).headline).toBe('</script><b>x</b>');
  });

  it('describes the community root as a WebSite', () => {
    const ld = JSON.parse(
      jsonLdForPage(
        'https://echo.example',
        'https://echo.example/',
        '/',
        null,
        'Echo Community',
      ),
    );
    expect(ld['@type']).toBe('WebSite');
    expect(ld.name).toBe('Echo Community');
  });

  it('stays silent on routes without content metadata', () => {
    expect(
      jsonLdForPage(
        'https://echo.example',
        'https://echo.example/feeds',
        '/feeds',
        null,
        'Echo',
      ),
    ).toBe('');
    expect(
      jsonLdForPage(
        'https://echo.example',
        'https://echo.example/groups/@x',
        '/groups/@x',
        { title: 'X', description: 'y' },
        'Echo',
      ),
    ).toBe('');
  });
});
