import type { RequestHandler } from '@sveltejs/kit';
import { notFound } from '$lib/server/helpers';
import { communityConfig } from '@openpeeps/core/config';
import sharp from 'sharp';

const iconCache = { base: 'default', cache: new Map<number, Buffer>() };

export const GET: RequestHandler = async ({ params: { size }, url: localUrl, fetch: svelteFetch }) =>

  communityConfig().then(async (config) => {
    const fetch = async (urlString: string) => {

      if (urlString.startsWith('/')) {
        return svelteFetch(urlString);
      }
      const url = new URL(urlString);

      return url.origin === localUrl.origin ? svelteFetch(url.pathname) : svelteFetch(urlString);
    };


    const pixelSize = Number(size?.split('x')[0]);

    if (isNaN(pixelSize)) {
      return notFound();
    }

    const defaultIconUrl = '/img/icon.svg';

    const baseUrl = config.theme.icon ?? defaultIconUrl;

    if (iconCache.base === baseUrl && iconCache.cache.has(pixelSize)) {
      return new Response(Uint8Array.from(iconCache.cache.get(pixelSize)!));
    }

    if (iconCache.base !== baseUrl) {
      iconCache.base = baseUrl;
      iconCache.cache = new Map<number, Buffer>();
    }

    const baseBuffer: ArrayBuffer =
      await fetch(config.theme.icon || defaultIconUrl).then((res) => res.arrayBuffer());

    const png = await sharp(baseBuffer)
      .resize(pixelSize, pixelSize)
      .png()
      .toBuffer();

    iconCache.cache.set(pixelSize, png);

    return new Response(Uint8Array.from(png));
  });
