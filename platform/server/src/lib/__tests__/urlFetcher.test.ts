import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractPageMetadata, fetchUrlHandler } from '../handlers/urlFetcher';

const hoisted = vi.hoisted(() => {
  const redisGet = vi.fn();
  const redisSet = vi.fn();
  const mediaStore = vi.fn();
  const fetchMock = vi.fn();
  return { redisGet, redisSet, mediaStore, fetchMock };
});

vi.mock('@openpeepshq/core/redis', () => ({
  getSharedConnection: async () => ({
    get: hoisted.redisGet,
    set: hoisted.redisSet,
  }),
}));

vi.mock('@openpeepshq/core/media', () => ({
  mediaStorage: async () => ({
    store: hoisted.mediaStore,
    getPath: (id: string, name: string) => `/media/${id}/${name}`,
  }),
}));

vi.mock('sharp', () => ({
  default: () => {
    const chain = {
      rotate: () => chain,
      resize: () => chain,
      webp: () => chain,
      toBuffer: async () => Buffer.from('fake-webp'),
    };
    return chain;
  },
}));

const docFromHtml = (html: string) => new JSDOM(html).window.document;

const htmlResponse = (html: string, status = 200) =>
  ({
    status,
    headers: {
      get: (name: string) =>
        name === 'content-type' ? 'text/html; charset=utf-8' : null,
    },
    text: async () => html,
  }) as unknown as Response;

const makeEvent = (url = 'http://test.local/') =>
  ({ url: new URL(url) }) as never;

describe('extractPageMetadata', () => {
  it('prefers og:title over the raw <title> (Instagram shows only the site name)', () => {
    const doc = docFromHtml(`
      <html>
        <head>
          <title>Instagram</title>
          <meta property="og:title" content="Jane Doe on Instagram: &quot;hello world&quot;" />
          <meta property="og:description" content="10 likes - j.doe on May 22, 2025" />
          <meta property="og:image" content="https://cdn.example/cover.jpg" />
        </head>
        <body></body>
      </html>
    `);
    expect(extractPageMetadata(doc)).toEqual({
      title: 'Jane Doe on Instagram: "hello world"',
      description: '10 likes - j.doe on May 22, 2025',
      image: 'https://cdn.example/cover.jpg',
    });
  });

  it('falls back to <title> and name=description when og:* tags are missing', () => {
    const doc = docFromHtml(`
      <html>
        <head>
          <title>My Blog Post</title>
          <meta name="description" content="A plain description" />
        </head>
        <body></body>
      </html>
    `);
    expect(extractPageMetadata(doc)).toEqual({
      title: 'My Blog Post',
      description: 'A plain description',
      image: undefined,
    });
  });

  it('returns undefined fields for pages without any metadata', () => {
    const doc = docFromHtml('<html><head></head><body><p>hi</p></body></html>');
    expect(extractPageMetadata(doc)).toEqual({
      title: undefined,
      description: undefined,
      image: undefined,
    });
  });

  it('accepts name= og:* and twitter:* tags when property= is missing', () => {
    const doc = docFromHtml(`
      <html><head>
        <title>Site</title>
        <meta name="og:title" content="OG title" />
        <meta name="twitter:description" content="Twitter description" />
        <meta name="twitter:image" content="https://cdn.example/t.jpg" />
      </head><body></body></html>
    `);
    expect(extractPageMetadata(doc)).toEqual({
      title: 'OG title',
      description: 'Twitter description',
      image: 'https://cdn.example/t.jpg',
    });
  });

  it('prefers og:* over twitter:* when both are present', () => {
    const doc = docFromHtml(`
      <html><head>
        <meta name="twitter:title" content="Twitter title" />
        <meta property="og:title" content="OG title" />
      </head><body></body></html>
    `);
    expect(extractPageMetadata(doc).title).toBe('OG title');
  });

  it('trims surrounding whitespace from the raw <title>', () => {
    const doc = docFromHtml(
      '<html><head>\n  <title>\n   Padded Title \n  </title></head><body></body></html>',
    );
    expect(extractPageMetadata(doc).title).toBe('Padded Title');
  });

  it('resolves relative og:image against the page URL', () => {
    const doc = docFromHtml(
      '<html><head><meta property="og:image" content="/img/cover.jpg" /></head><body></body></html>',
    );
    expect(extractPageMetadata(doc, 'https://example.com/a?b=1').image).toBe(
      'https://example.com/img/cover.jpg',
    );
  });
});

describe('fetchUrlHandler', () => {
  beforeEach(() => {
    hoisted.redisGet.mockReset();
    hoisted.redisSet.mockReset();
    hoisted.mediaStore.mockReset();
    hoisted.fetchMock.mockReset();
    vi.stubGlobal('fetch', hoisted.fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the preview without an image when the image fetch fails, and caches it briefly', async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Post title" />
        <meta property="og:image" content="https://cdn.example/cover.jpg" />
      </head><body></body></html>`;
    hoisted.redisGet.mockResolvedValue(null);
    hoisted.fetchMock
      .mockResolvedValueOnce(htmlResponse(html))
      .mockRejectedValueOnce(new Error('image timeout'));

    const result = await fetchUrlHandler(
      { url: 'https://example.com/post' },
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      image: '',
      title: 'Post title',
      url: 'https://example.com/post',
    });
    const cacheKey = `url:metadata:v2:${encodeURIComponent(
      'https://example.com/post',
    )}`;
    expect(hoisted.redisSet).toHaveBeenCalledWith(
      cacheKey,
      expect.stringContaining('"image":""'),
      { EX: 5 * 60 },
    );
  });

  it('caches a full preview for a week when the image fetch succeeds', async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Post title" />
        <meta property="og:image" content="https://cdn.example/cover.jpg" />
      </head><body></body></html>`;
    hoisted.redisGet.mockResolvedValue(null);
    hoisted.fetchMock
      .mockResolvedValueOnce(htmlResponse(html))
      .mockResolvedValueOnce({
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      } as unknown as Response);
    hoisted.mediaStore.mockResolvedValue('img-1');

    const result = await fetchUrlHandler(
      { url: 'https://example.com/post' },
      makeEvent(),
    );

    expect(result.data).toMatchObject({
      image: '/media/img-1/preview.webp',
      title: 'Post title',
    });
    const cacheKey = `url:metadata:v2:${encodeURIComponent(
      'https://example.com/post',
    )}`;
    expect(hoisted.redisSet).toHaveBeenCalledWith(
      cacheKey,
      expect.any(String),
      { EX: 60 * 24 * 7 * 60 },
    );
  });

  it('serves the cached preview without fetching', async () => {
    const cached = {
      image: '',
      title: 'T',
      description: '',
      url: 'https://example.com/post',
    };
    hoisted.redisGet.mockResolvedValue(JSON.stringify(cached));

    const result = await fetchUrlHandler(
      { url: 'https://example.com/post' },
      makeEvent(),
    );

    expect(result).toEqual({ statusCode: 200, success: true, data: cached });
    expect(hoisted.fetchMock).not.toHaveBeenCalled();
    expect(hoisted.redisSet).not.toHaveBeenCalled();
  });

  it('returns 404 when the page fetch fails', async () => {
    hoisted.redisGet.mockResolvedValue(null);
    hoisted.fetchMock.mockRejectedValueOnce(new Error('dns failure'));

    await expect(
      fetchUrlHandler({ url: 'https://example.com/post' }, makeEvent()),
    ).rejects.toMatchObject({ __HTTP_ERROR__: true, status: 404 });
    expect(hoisted.redisSet).not.toHaveBeenCalled();
  });
});
