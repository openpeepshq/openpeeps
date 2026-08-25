import { readFile } from 'node:fs/promises';
import type { Request, Response } from 'express';
import Mustache from 'mustache';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { communityConfig } from '@openpeepshq/core/config';
import { logger } from '@openpeepshq/core/log';

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
): SpaHtmlContext => {
  const name = config.info.name?.trim() || 'OpenPeeps';
  const description =
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
  return {
    name,
    description,
    imageUrl: image ? absoluteUrl(origin, image) : '',
    pageUrl,
    themeColor: config.theme.light?.primaryHex || '#0f172a',
    path,
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
): Promise<string> => {
  const [template, config] = await Promise.all([
    loadIndexHtml(indexHtmlPath),
    communityConfig(),
  ]);
  return renderSpaHtmlTemplate(
    template,
    spaHtmlContextFromConfig(config, origin, pageUrl),
  );
};

export const sendSpaHtml = async (
  indexHtmlPath: string,
  req: Request,
  res: Response,
) => {
  try {
    const host = req.get('host') ?? 'localhost';
    const origin = `${req.protocol}://${host}`;
    const pageUrl = `${origin}${req.originalUrl.split('?')[0] || '/'}`;
    const html = await renderSpaHtml(indexHtmlPath, origin, pageUrl);
    res.type('html');
    res.set({ 'Cache-Control': 'public, max-age=60' });
    res.send(html);
  } catch (err) {
    log.error('spaHtml: failed to render community meta', err);
    res.status(500).send('Internal server error');
  }
};
