import { JSDOM, VirtualConsole } from 'jsdom';
import type { FetchUrlRequest } from '@openpeepshq/common/types';
import { notFound } from '#lib/errors';
import { getSharedConnection } from '@openpeepshq/core/redis';
import { mediaStorage } from '@openpeepshq/core/media';
import { logger } from '@openpeepshq/core/log';
import sharp from 'sharp';
import type { RequestEvent } from '@riddl/core';

const log = logger('server:urlFetcher');

const WEEK_SECONDS = 60 * 24 * 7 * 60;
// Degraded (image-less) previews retry after a few minutes instead of
// pinning a transient image failure for a week.
const DEGRADED_TTL_SECONDS = 5 * 60;

const isAbsoluteUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }
  return url.startsWith('http://') || url.startsWith('https://');
};

const firstMetaContent = (doc: Document, selectors: string[]) =>
  selectors
    .map((selector) => doc.querySelector(selector)?.getAttribute('content'))
    .find((content) => content !== undefined);

/**
 * og:* tags carry the real page context; the raw `<title>` is often just
 * the site name (e.g. Instagram), so prefer og:* (property= or name=),
 * then twitter:*, then plain fallbacks.
 */
export const extractPageMetadata = (doc: Document, pageUrl?: string) => {
  const ogTitle = firstMetaContent(doc, [
    'meta[property="og:title"]',
    'meta[name="og:title"]',
    'meta[name="twitter:title"]',
  ]);
  const title = ogTitle || doc.querySelector('title')?.textContent?.trim();
  const ogDescription = firstMetaContent(doc, [
    'meta[property="og:description"]',
    'meta[name="og:description"]',
    'meta[name="twitter:description"]',
  ]);
  const description =
    ogDescription ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content');
  const rawImage = firstMetaContent(doc, [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[name="twitter:image"]',
  ]);
  // Resolve relative og:image values against the page URL; malformed
  // references are left as-is so isAbsoluteUrl drops them later.
  let image = rawImage;
  if (rawImage && pageUrl) {
    try {
      image = new URL(rawImage, pageUrl).toString();
    } catch {
      // ignore
    }
  }
  return { title, description, image };
};

const createPreviewImage = async (image: string | null | undefined) => {
  if (!isAbsoluteUrl(image)) {
    return '';
  }
  const response = await fetch(image as string);
  const imageBuffer = await response.arrayBuffer().then(sharp);
  const arrayBuffer = await imageBuffer
    .rotate()
    .resize({ width: 128, height: 128 })
    .webp()
    .toBuffer()
    .then((b) => b.buffer);
  const storage = await mediaStorage();
  const id = await storage.store(arrayBuffer);
  return storage.getPath(id, 'preview.webp');
};

export const fetchUrlHandler = async (
  request: FetchUrlRequest,
  event: RequestEvent,
) => {
  const redis = await getSharedConnection();

  const pageUrl = request.url + event.url.search + event.url.hash;

  // v2: metadata extraction changed (og:* preferred) — refresh stale entries.
  const cacheKey = `url:metadata:v2:${encodeURIComponent(pageUrl)}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
    return {
      statusCode: 200,
      success: true,
      data: parsedData,
    };
  }

  const response = await fetch(pageUrl, {
    headers: {
      accept: 'text/html; charset=UTF-8',
      'accept-language': 'en-US, en',
      'user-agent': 'AllPeeP/1.0',
    },
  }).catch(() => {
    throw notFound();
  });
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('text/html')) {
    throw notFound();
  }

  const data = await response.text();

  const virtualConsole = new VirtualConsole();

  const dom = new JSDOM(data, { virtualConsole });
  const doc = dom.window.document;

  const { title, description, image } = extractPageMetadata(doc, pageUrl);

  // A broken preview image must not kill the whole card — keep showing the
  // title/description without an image.
  let imageUrl = '';
  let imageFailed = false;
  try {
    imageUrl = await createPreviewImage(image);
  } catch (err) {
    imageFailed = true;
    log.warn('urlFetcher: preview image fetch failed', image, err);
  }

  const responseData = {
    image: imageUrl,
    title: title || '',
    description: description || '',
    url: pageUrl,
  };

  await redis.set(cacheKey, JSON.stringify(responseData), {
    EX: imageFailed ? DEGRADED_TTL_SECONDS : WEEK_SECONDS,
  });

  return {
    statusCode: response.status,
    success: response.status === 200 || response.status === 201,
    data: responseData,
  };
};
