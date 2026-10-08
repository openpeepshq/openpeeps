import type { Express, Request } from 'express';
import { communityConfig, config } from '@openpeepshq/core/config';
import {
  crawlableEntries,
  spaMetaForPath,
  type CrawlableEntry,
  type SpaMeta,
} from '@openpeepshq/core/seo';
import { logger } from '@openpeepshq/core/log';
import { serverRootUrl } from '@openpeepshq/core/server';
import { getSharedConnection } from '@openpeepshq/core/redis';
import { robotsTxt, sitemapXml } from './seo';

const log = logger('server:seo');

const SITEMAP_CACHE_KEY = 'seo:sitemap';
// Short by design: a deleted or re-private post should leave the sitemap well
// before a crawler comes back for it, and the scan is cheap enough to redo.
const SITEMAP_CACHE_TTL_SECONDS = 15 * 60;

const sitemapEntries = async (
  indexProfiles: boolean,
): Promise<CrawlableEntry[]> => {
  const redis = await getSharedConnection();
  const cacheKey = `${SITEMAP_CACHE_KEY}:${indexProfiles ? 'profiles' : 'nop'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as CrawlableEntry[];

  const entries = await crawlableEntries({ indexProfiles });
  await redis.set(cacheKey, JSON.stringify(entries), {
    EX: SITEMAP_CACHE_TTL_SECONDS,
  });
  return entries;
};

export const installSeoEndpoint = (app: Express) => {
  // Origins come from `serverRootUrl()` config, not the request: a spoofed
  // `Host` header must never reach the `Sitemap:` line or the `<loc>` entries.
  app.get('/robots.txt', async (_req, res) => {
    try {
      const [core, origin] = await Promise.all([config(), serverRootUrl()]);
      res
        .type('text/plain')
        .set('Cache-Control', 'public, max-age=3600')
        .send(robotsTxt(origin, core.server.publicContent));
    } catch (err) {
      log.error('seo: failed to build robots.txt', err);
      res.status(500).send('Internal server error');
    }
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const [core, community, origin] = await Promise.all([
        config(),
        communityConfig(),
        serverRootUrl(),
      ]);
      if (!core.server.publicContent) {
        res.status(404).send('Not found');
        return;
      }
      const xml = sitemapXml(
        origin,
        await sitemapEntries(!!community.settings?.indexProfiles),
      );
      res
        .type('application/xml')
        .set('Cache-Control', 'public, max-age=900')
        .send(xml);
    } catch (err) {
      log.error('seo: failed to build sitemap', err);
      res.status(500).send('Internal server error');
    }
  });
};

/**
 * Title, description and not-found verdict for a content route, resolved here
 * rather than inside the renderer so the SPA shell keeps no dependency on the
 * data layer. A lookup failure reports "serve": the page must still render with
 * community-wide metadata, and a Redis hiccup must not turn real pages into 404s.
 */
export const spaMetaForRequest = async (req: Request): Promise<SpaMeta> => {
  try {
    const community = await communityConfig();
    return await spaMetaForPath(req.originalUrl.split('?')[0] || '/', {
      indexProfiles: !!community.settings?.indexProfiles,
    });
  } catch (err) {
    log.warn('seo: page metadata lookup failed', err);
    return { meta: null, notFound: false };
  }
};
