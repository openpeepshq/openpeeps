import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractPageMetadata, fetchUrlHandler } from '../handlers/urlFetcher';
import { PAGE_BODY_CAP_BYTES, testExports } from '../urlGuard';

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

const redirectResponse = (location: string, status = 302) =>
  ({
    status,
    headers: {
      get: (name: string) => (name === 'location' ? location : null),
    },
  }) as unknown as Response;

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

describe('urlGuard blocklist (real net.BlockList, no mocks)', () => {
  const { isBlockedIp } = testExports;

  it('blocks every reserved IPv4 range', () => {
    expect(isBlockedIp('0.0.0.1')).toBe(true);
    expect(isBlockedIp('10.1.2.3')).toBe(true);
    expect(isBlockedIp('100.64.1.1')).toBe(true);
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('192.0.0.9')).toBe(true);
    expect(isBlockedIp('192.0.2.1')).toBe(true);
    expect(isBlockedIp('192.88.99.1')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('198.18.0.1')).toBe(true);
    expect(isBlockedIp('198.51.100.7')).toBe(true);
    expect(isBlockedIp('203.0.113.5')).toBe(true);
    expect(isBlockedIp('224.0.0.1')).toBe(true);
    expect(isBlockedIp('240.0.0.1')).toBe(true);
    expect(isBlockedIp('255.255.255.255')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('172.32.0.1')).toBe(false);
    expect(isBlockedIp('100.128.0.1')).toBe(false);
    expect(isBlockedIp('198.20.0.1')).toBe(false);
  });

  it('blocks reserved IPv6 ranges', () => {
    expect(isBlockedIp('::')).toBe(true);
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fd12::1')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
    expect(isBlockedIp('ff02::1')).toBe(true);
    expect(isBlockedIp('2001:db8::1')).toBe(true);
    expect(isBlockedIp('64:ff9b::808:808')).toBe(true);
    expect(isBlockedIp('64:ff9b:1::1')).toBe(true);
  });

  it('allows public IPv6 addresses', () => {
    expect(isBlockedIp('2606:4700::6810:84e4')).toBe(false);
    expect(isBlockedIp('2a00::1')).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 spellings of private addresses (dotted and hex)', () => {
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:7f00:1')).toBe(true);
    expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIp('::ffff:0a00:1')).toBe(true);
  });

  it('does not block IPv4-mapped spellings of public addresses', () => {
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
    expect(isBlockedIp('::ffff:808:808')).toBe(false);
  });

  it('ignores non-IP input', () => {
    expect(isBlockedIp('example.com')).toBe(false);
    expect(isBlockedIp('not-an-ip')).toBe(false);
  });
});

describe('safeFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects blocked IP-literal URLs before any request is made', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('http://127.0.0.1/', { capBytes: 1000, timeoutMs: 1000 }),
    ).rejects.toThrow(/Blocked/);
    await expect(
      safeFetch('http://169.254.169.254/', {
        capBytes: 1000,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/Blocked/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects non-http(s) URLs', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('ftp://example.com/file', {
        capBytes: 1000,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/Blocked/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('aborts and throws when the body exceeds the cap', async () => {
    const { safeFetch } = await import('../urlGuard');
    const chunk = Uint8Array.from({ length: 700 }, () => 0x61);
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunk })
        .mockResolvedValueOnce({ done: false, value: chunk }),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: { getReader: () => reader },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('https://example.com/big', { capBytes: 1000, timeoutMs: 1000 }),
    ).rejects.toThrow(/exceeds/);
    expect(reader.cancel).toHaveBeenCalled();
  });

  it('returns a Response carrying the capped body when under the limit', async () => {
    const { safeFetch } = await import('../urlGuard');
    const payload = Uint8Array.from([1, 2, 3]);
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: payload })
        .mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      body: { getReader: () => reader },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    const response = await safeFetch('https://example.com/', {
      capBytes: 1000,
      timeoutMs: 1000,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(payload);
    expect(reader.cancel).not.toHaveBeenCalled();
  });

  it('passes the cap, timeout, dispatcher, and headers into the guarded request', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          cancel: vi.fn(),
        }),
      },
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    await safeFetch('https://example.com/', {
      capBytes: PAGE_BODY_CAP_BYTES,
      timeoutMs: 10_000,
      headers: { 'user-agent': 'AllPeeP/1.0' },
    });
    const init = fetchSpy.mock.calls[0][1];
    expect(init.headers).toEqual({ 'user-agent': 'AllPeeP/1.0' });
    expect(init.dispatcher).toBeDefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe('manual');
  });

  it('follows a redirect chain and validates the redirect target host', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse('http://header.example/x'))
      .mockResolvedValueOnce(redirectResponse('https://origin.example/final'))
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            cancel: vi.fn(),
          }),
        },
      } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    const response = await safeFetch('https://example.com/start', {
      capBytes: 1000,
      timeoutMs: 1000,
    });
    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      'https://example.com/start',
      'http://header.example/x',
      'https://origin.example/final',
    ]);
    expect(
      fetchSpy.mock.calls.every((call) => call[1].redirect === 'manual'),
    ).toBe(true);
  });

  it('blocks a redirect to a loopback IP literal without connecting', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        redirectResponse('http://127.0.0.1:8080/private-probe'),
      );
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('https://example.com/start', {
        capBytes: 1000,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/Blocked: http:\/\/127\.0\.0\.1/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks a redirect to the cloud metadata service without connecting', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        redirectResponse('http://169.254.169.254/latest/meta-data/'),
      );
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('https://example.com/start', {
        capBytes: 1000,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/Blocked: http:\/\/169\.254\.169\.254/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks a redirect to a private RFC1918 literal without connecting', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse('http://10.0.0.5/secret'));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('https://example.com/start', {
        capBytes: 1000,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/Blocked: http:\/\/10\.0\.0\.5/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects a redirect hop past the cap before fetching it', async () => {
    const { safeFetch } = await import('../urlGuard');
    const fetchSpy = vi.fn(() =>
      Promise.resolve(redirectResponse(`http://loop.example/${Math.random()}`)),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      safeFetch('https://example.com/start', {
        capBytes: 1000,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/Too many redirects/);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(20);
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

  it('returns 404 without fetching when the page URL is a blocked host', async () => {
    hoisted.redisGet.mockResolvedValue(null);

    await expect(
      fetchUrlHandler({ url: 'http://127.0.0.1:8080/secret' }, makeEvent()),
    ).rejects.toMatchObject({ __HTTP_ERROR__: true, status: 404 });
    expect(hoisted.fetchMock).not.toHaveBeenCalled();
    expect(hoisted.redisSet).not.toHaveBeenCalled();
  });

  it('returns 404 for a blocked host spelled as an octal IPv4 literal', async () => {
    hoisted.redisGet.mockResolvedValue(null);

    // new URL() canonicalizes 0177.0.0.1 to 127.0.0.1 before the guard runs
    await expect(
      fetchUrlHandler(
        { url: 'http://0177.0.0.1/latest/meta-data/' },
        makeEvent(),
      ),
    ).rejects.toMatchObject({ __HTTP_ERROR__: true, status: 404 });
    expect(hoisted.fetchMock).not.toHaveBeenCalled();
  });

  it('treats a blocked og:image as an image failure and caches the degraded preview briefly', async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Post title" />
        <meta property="og:image" content="http://169.254.169.254/creds.png" />
      </head><body></body></html>`;
    hoisted.redisGet.mockResolvedValue(null);
    hoisted.fetchMock.mockResolvedValueOnce(htmlResponse(html));

    const result = await fetchUrlHandler(
      { url: 'https://example.com/post' },
      makeEvent(),
    );

    expect(result.data).toMatchObject({ image: '', title: 'Post title' });
    const cacheKey = `url:metadata:v2:${encodeURIComponent(
      'https://example.com/post',
    )}`;
    expect(hoisted.redisSet).toHaveBeenCalledWith(
      cacheKey,
      expect.stringContaining('"image":""'),
      { EX: 5 * 60 },
    );
  });
});
