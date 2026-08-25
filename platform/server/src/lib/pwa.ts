import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response } from 'express';
import sharp from 'sharp';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { communityConfig } from '@openpeepshq/core/config';
import { mediaStorage } from '@openpeepshq/core/media';
import { logger } from '@openpeepshq/core/log';

const log = logger('server:pwa');

const DEFAULT_ICON = '/img/icon.svg';

type PwaIconVariant = 'web' | 'mobile';

const iconCaches: Record<
  PwaIconVariant,
  { base: string; cache: Map<number, Buffer> }
> = {
  web: { base: 'default', cache: new Map() },
  mobile: { base: 'default', cache: new Map() },
};

const resolveStaticRoots = (): string[] => {
  const roots: string[] = [];
  const fromEnv = process.env.WEB_DIST_PATH;
  if (fromEnv) {
    roots.push(
      path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv),
    );
  }
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  roots.push(path.resolve(serverDir, '../../web/dist'));
  roots.push(path.resolve(serverDir, '../../web/public'));
  return [...new Set(roots.filter((r) => existsSync(r)))];
};

const fetchIconBuffer = async (
  urlString: string,
  req: Request,
): Promise<Buffer> => {
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    const response = await fetch(urlString);
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${urlString}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (urlString.startsWith('/storage/allpeep/')) {
    const match = /^\/storage\/allpeep\/([^/]+)\/(.+)$/.exec(urlString);
    if (!match) {
      throw new Error(`Invalid storage URL: ${urlString}`);
    }
    const [, id] = match;
    const storage = await mediaStorage();
    const data = await storage.getData(id);
    return Buffer.from(data as ArrayBuffer);
  }

  if (urlString.startsWith('/')) {
    const pathname = urlString.split('?')[0];
    for (const root of resolveStaticRoots()) {
      const filePath = path.join(root, pathname);
      if (existsSync(filePath)) {
        return readFile(filePath);
      }
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const response = await fetch(`${origin}${urlString}`);
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  throw new Error(`Icon not found: ${urlString}`);
};

const iconBaseUrl = (variant: PwaIconVariant, config: CommunityConfig) =>
  variant === 'mobile'
    ? (config.theme.mobileIcon ?? config.theme.icon ?? DEFAULT_ICON)
    : (config.theme.icon ?? DEFAULT_ICON);

const renderIcon = async (
  variant: PwaIconVariant,
  pixelSize: number,
  req: Request,
): Promise<Buffer> => {
  const config = await communityConfig();
  const baseUrl = iconBaseUrl(variant, config);
  const iconCache = iconCaches[variant];

  if (iconCache.base === baseUrl && iconCache.cache.has(pixelSize)) {
    return iconCache.cache.get(pixelSize)!;
  }

  if (iconCache.base !== baseUrl) {
    iconCache.base = baseUrl;
    iconCache.cache.clear();
  }

  const baseBuffer = await fetchIconBuffer(baseUrl, req);
  const png = await sharp(baseBuffer)
    .resize(pixelSize, pixelSize)
    .png()
    .toBuffer();
  iconCache.cache.set(pixelSize, png);
  return png;
};

export const buildPwaManifest = (config: CommunityConfig, origin: string) => ({
  name: config.info.name,
  short_name: config.info.name,
  id: '/',
  icons: [
    {
      src: 'mobile-icons/128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'mobile-icons/152x152.png',
      sizes: '152x152',
      type: 'image/png',
    },
    {
      src: 'mobile-icons/167x167.png',
      sizes: '167x167',
      type: 'image/png',
    },
    {
      src: 'mobile-icons/180x180.png',
      sizes: '180x180',
      type: 'image/png',
    },
    {
      src: 'mobile-icons/192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'mobile-icons/256x256.png',
      sizes: '256x256',
      type: 'image/png',
    },
    {
      src: 'mobile-icons/512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
  start_url: origin,
  display: 'standalone',
  theme_color: config.theme?.light?.primaryHex || '#000000',
  prefer_related_applications: false,
});

const sendIcon =
  (variant: PwaIconVariant) => async (req: Request, res: Response) => {
    const sizeParam = req.params.size as string;
    const pixelSize = Number(sizeParam?.split('x')[0]);
    if (!pixelSize || Number.isNaN(pixelSize)) {
      res.status(404).send('Not found');
      return;
    }

    try {
      const png = await renderIcon(variant, pixelSize, req);
      res.type('image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(png);
    } catch (err) {
      log.warn('pwa: icon render failed', {
        variant,
        size: sizeParam,
        err: String(err),
      });
      res.status(404).send('Not found');
    }
  };

export const installPwaEndpoint = (app: Express) => {
  app.get('/pwa/manifest.json', async (req, res) => {
    try {
      const config = await communityConfig();
      const origin = `${req.protocol}://${req.get('host')}`;
      res.type('application/manifest+json');
      res.set('Cache-Control', 'public, max-age=300');
      res.json(buildPwaManifest(config, origin));
    } catch (err) {
      log.error('pwa: manifest failed', err);
      res.status(500).send('Internal server error');
    }
  });

  app.get('/pwa/icons/:size.png', sendIcon('web'));
  app.get('/pwa/mobile-icons/:size.png', sendIcon('mobile'));

  app.get('/favicon.ico', async (req, res) => {
    try {
      const png = await renderIcon('web', 32, req);
      res.type('image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(png);
    } catch (err) {
      log.warn('pwa: favicon failed', String(err));
      res.status(404).send('Not found');
    }
  });
};
