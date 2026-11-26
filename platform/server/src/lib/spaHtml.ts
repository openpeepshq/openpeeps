import { readFile } from 'node:fs/promises';
import type { Request, Response } from 'express';
import Mustache from 'mustache';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { communityConfig } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';
import { serverRootUrl } from '@openpeepshq/core/server';
import type { CrawlableMeta } from '@openpeepshq/core/seo';
import { seoRoute } from '@openpeepshq/core/seo';
import { findPostBySlug, canReadPost } from '@openpeepshq/core/posts';
import { capabilitiesConfig } from '@openpeepshq/core/config';
import { jsonLdForPage } from './seo';

const log = logger('server:spaHtml');

/** Values available to `platform/web/index.html` (Mustache). */
export type SpaHtmlContext = {
  name: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
  themeColor: string;
  /** Path only (`/feeds/local`) — handy for future URL-specific content. */
  path: string;
  /** Pre-stringified, script-safe JSON-LD; '' renders nothing. */
  jsonLd: string;
  /**
   * True only for a content route whose meta resolved to null — signal "don't
   * index". Derived from the route kind so a caller cannot miscompute it.
   */
  noindex: boolean;
};

const absoluteUrl = (origin: string, url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${origin.replace(/\/$/, '')}${path}`;
};

export const spaHtmlContextFromConfig = (
  config: CommunityConfig,
  origin: string,
  pageUrl: string,
  /** Set for content routes so a shared post is not described as the homepage. */
  meta: CrawlableMeta | null,
): SpaHtmlContext => {
  const community = config.info.name?.trim() || 'OpenPeeps';
  const name = meta?.title ? `${meta.title} · ${community}` : community;
  const description =
    meta?.description ||
    config.info.tagLine?.trim() ||
    config.info.name?.trim() ||
    'OpenPeeps community';
  // Prefer light.logoSmall (admin uploads); fall back to dark / favicon.
  const image =
    config.theme.light?.logoSmall ??
    config.theme.dark?.logoSmall ??
    config.theme.icon ??
    '';
  let path = '/';
  try {
    path = new URL(pageUrl).pathname || '/';
  } catch {
    path = '/';
  }
  // `noindex` is a property of the route kind, not of the meta: a null meta on
  // a content route means "unreadable — don't index", while app routes (which
  // never have meta) stay indexable. Deriving it here keeps a caller from
  // tagging the homepage or dropping the tag on an unreadable post.
  // `indexProfiles` pinned true: this re-parse decides "is this a content
  // route", and a profile path must stay one even where the community disables
  // profile indexing — a null meta there tags noindex instead of indexing a
  // bare shell.
  const noindex =
    meta === null && seoRoute(path, { indexProfiles: true }) !== null;
  return {
    name,
    description,
    imageUrl: image ? absoluteUrl(origin, image) : '',
    pageUrl,
    themeColor: config.theme.light?.primaryHex || '#0f172a',
    path,
    jsonLd: jsonLdForPage(origin, pageUrl, path, meta, community),
    noindex,
  };
};

/** Render the SPA Mustache shell (`index.html`) with community / request context. */
export const renderSpaHtmlTemplate = (
  template: string,
  context: SpaHtmlContext,
): string => Mustache.render(template, context);

let cachedIndexHtml: { path: string; html: string } | null = null;

export const loadIndexHtml = async (indexHtmlPath: string): Promise<string> => {
  if (cachedIndexHtml?.path === indexHtmlPath) {
    return cachedIndexHtml.html;
  }
  const html = await readFile(indexHtmlPath, 'utf8');
  cachedIndexHtml = { path: indexHtmlPath, html };
  return html;
};

export const renderSpaHtml = async (
  indexHtmlPath: string,
  origin: string,
  pageUrl: string,
  meta: CrawlableMeta | null,
): Promise<string> => {
  const [template, config] = await Promise.all([
    loadIndexHtml(indexHtmlPath),
    communityConfig(),
  ]);
  return renderSpaHtmlTemplate(
    template,
    spaHtmlContextFromConfig(config, origin, pageUrl, meta),
  );
};

/**
 * Extensions that can never name a client route — they are probes for other
 * stacks. They used to answer with a 200 community shell, which search engines
 * report as a soft 404, and which also hands the community name to every
 * scanner asking for `/wp-login.php`.
 */
const UNUSABLE_PATH =
  /\.(php|phar|asp|aspx|jsp|jsf|cgi|pl|exe|dll|sql|env|ini|log|bak|old|orig|swp|save|tmpl|tpl|action|do)~?$/i;

export type SpaRequestDecision =
  | { action: 'serve' }
  | { action: 'redirect'; to: string }
  | { action: 'reject' };

/**
 * `express.static` serves `index.html` verbatim, so requesting it directly hands
 * crawlers the unrendered `{{name}}` placeholders — a duplicate of `/` carrying
 * a broken title and a 15-character description. It must redirect to the route
 * that renders them.
 */
export const decideSpaRequest = (pathname: string): SpaRequestDecision => {
  if (/^\/index\.html?$/i.test(pathname))
    return { action: 'redirect', to: '/' };
  if (UNUSABLE_PATH.test(pathname)) return { action: 'reject' };
  return { action: 'serve' };
};

/**
 * A slug URL (`/{slug}` or `/{handle}/{slug}`) resolves to a real article, but
 * the web router has no client-side route for it — without a redirect a browser
 * (or a crawler following the sitemap) lands on an error shell. The canonical
 * `/{handle}/{slug}` and instance `/{slug}` spellings both map to one post, so
 * a 301 to that post's `/posts/:postId` route is the correct target: it renders
 * in-app and gives search engines a single canonical URL.
 *
 * Only recognised slug routes that resolve to a post produce a redirect; an
 * unknown slug falls through to the normal SPA shell (a 404-ish page the client
 * renders), never to a post it doesn't own. `findPostBySlug` already applies
 * the read/visibility rule, so a post a caller cannot read resolves to nothing.
 */
export const slugCanonicalRedirect = async (
  pathname: string,
  { indexProfiles }: { indexProfiles: boolean },
): Promise<string | null> => {
  const route = seoRoute(pathname, { indexProfiles });
  if (!route || route.kind !== 'slug') return null;
  const post = await findPostBySlug(
    route.slug,
    route.handle,
    route.instanceScoped,
  );
  if (!post) return null;
  // Re-apply the read rule for an anonymous caller — exactly as the SEO meta
  // layer does — so a group/private article's slug never 301s (and leaks its
  // post id) to a visitor or crawler who cannot read it.
  const readable = await canReadPost(await capabilitiesConfig(), {
    scopes: [],
  })(post);
  return readable ? `/posts/${post.id}` : null;
};

/**
 * Serves the shell with crawler-facing absolute URLs (canonical, og:url,
 * imageUrl) pinned to `serverRootUrl()` — never the `Host` header. A trusted
 * proxy forwards attacker-chosen hosts, and a poisoned `canonical` is index
 * damage that outlives the request; the plain-http container behind TLS
 * termination also means the request scheme is not the public one.
 */
export const sendSpaHtml = async (
  indexHtmlPath: string,
  req: Request,
  res: Response,
  meta: CrawlableMeta | null,
) => {
  try {
    const origin = await serverRootUrl();
    const pageUrl = `${origin}${req.originalUrl.split('?')[0] || '/'}`;
    const html = await renderSpaHtml(indexHtmlPath, origin, pageUrl, meta);
    res.type('html');
    res.set({ 'Cache-Control': 'public, max-age=60' });
    res.send(html);
  } catch (err) {
    log.error('spaHtml: failed to render community meta', err);
    res.status(500).send('Internal server error');
  }
};
