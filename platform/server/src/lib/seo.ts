import type { CrawlableEntry, CrawlableMeta } from '@openpeepshq/core/seo';

/** Logged-out surfaces that must never reach a search index. */
const DISALLOWED_PATHS = [
  '/admin',
  '/settings',
  '/conversations',
  '/notifications',
  '/auth',
  '/feeds',
];

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

const trimOrigin = (origin: string) => origin.replace(/\/$/, '');

const isoDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toISOString().slice(0, 10);
};

/**
 * A private community tells every crawler away. `publicContent` is the single
 * switch for anonymous readability, so it is also the switch for crawlability —
 * a sitemap would otherwise advertise URLs the crawler cannot read.
 */
export const robotsTxt = (origin: string, publicContent: boolean): string =>
  publicContent
    ? [
        'User-agent: *',
        ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
        'Allow: /',
        `Sitemap: ${trimOrigin(origin)}/sitemap.xml`,
        '',
      ].join('\n')
    : 'User-agent: *\nDisallow: /\n';

export const sitemapXml = (
  origin: string,
  entries: CrawlableEntry[],
): string => {
  const base = trimOrigin(origin);
  const urls = entries
    .map((entry) => {
      const loc = escapeXml(`${base}${entry.path}`);
      const lastmod = entry.updatedAt ? isoDate(entry.updatedAt) : '';
      return lastmod
        ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
        : `  <url><loc>${loc}</loc></url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

/**
 * JSON-LD for the SPA shell: a `WebSite` on the community root and a
 * `DiscussionForumPosting` on post pages — the shapes Google understands for
 * community platforms. `</script>` in user-authored text (post titles!) would
 * otherwise escape the inline script, so `<` goes to `<` during stringification.
 * Empty string = no structured data worth emitting for this route.
 */
export const jsonLdForPage = (
  origin: string,
  pageUrl: string,
  pathname: string,
  meta: CrawlableMeta | null,
  communityName: string,
): string => {
  const base = trimOrigin(origin);
  const document =
    meta?.kind === 'post'
      ? {
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          headline: meta.title,
          articleBody: meta.description,
          datePublished: meta.datePublished,
          dateModified: meta.dateModified,
          author: {
            '@type': 'Person',
            name: meta.authorName || communityName,
          },
          url: pageUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: communityName,
            url: `${base}/`,
          },
        }
      : pathname === '/'
        ? {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: communityName,
            url: pageUrl,
          }
        : null;
  if (!document) return '';
  return JSON.stringify(document).replace(/</g, '\\u003c');
};
