import { JSDOM, VirtualConsole } from 'jsdom';
import type { FetchUrlRequest } from '@openpeeps/common/types';
import { notFound } from '$lib/server/api/errors';
import { getSharedConnection } from '@openpeeps/core/redis';
import { mediaStorage } from '@openpeeps/core/media';
import sharp from 'sharp';
import type { RequestEvent } from '@sveltejs/kit';


const isAbsoluteUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }
  return url.startsWith('http://') || url.startsWith('https://');
};

const createPreviewImage = async (image: string | null | undefined) => {
  if (!isAbsoluteUrl(image)) {
    return '';
  }
  const response = await fetch(image as string);
  const imageBuffer = await response.arrayBuffer().then(sharp);
  const arrayBuffer = await imageBuffer.rotate().resize({ width: 128, height: 128 }).webp().toBuffer().then(b => b.buffer);
  const storage = await mediaStorage();
  const id = await storage.store(arrayBuffer);
  return storage.getPath(id, 'preview.webp');
};

export const fetchUrlHandler = async (request: FetchUrlRequest, event: RequestEvent) => {
  const redis = await getSharedConnection();


  const pageUrl = request.url + event.url.search + event.url.hash;

  const cacheKey = `url:metadata:${encodeURIComponent(pageUrl)}`;

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

  const title = doc.querySelector('title')?.textContent;
  const description = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute('content');
  const image = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute('content');

  const imageUrl = await createPreviewImage(image);

  const responseData = {
    image: imageUrl,
    title: title || '',
    description: description || '',
    url: pageUrl,
  };

  await redis.set(cacheKey, JSON.stringify(responseData), {
    EX: 60 * 24 * 7 * 60, // Expires in a week
  });

  return {
    statusCode: response.status,
    success: response.status === 200 || response.status === 201,
    data: responseData,
  };
};
