import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestRelayCrawl } from './crawl';

const configMock = vi.hoisted(() => vi.fn());
vi.mock('../config', () => ({ config: configMock }));
vi.mock('../log', () => ({
  logger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

describe('requestRelayCrawl', () => {
  beforeEach(() => {
    configMock.mockReset();
  });

  it('throws when atproto is inactive', async () => {
    configMock.mockResolvedValue({ atproto: { active: false } });
    await expect(requestRelayCrawl()).rejects.toThrowError(
      'atproto is inactive',
    );
  });

  it('falls back to the default relay and community handle domain', async () => {
    configMock.mockResolvedValue({
      atproto: {
        active: true,
        handleDomain: 'community.example',
        relayUrl: undefined,
      },
    });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(requestRelayCrawl()).resolves.toEqual({
        hostname: 'community.example',
        relay: 'https://bsky.network',
      });
      const [url, init] = vi.mocked(fetchMock).mock.calls[0];
      expect(url).toBe(
        'https://bsky.network/xrpc/com.atproto.sync.requestCrawl',
      );
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        hostname: 'community.example',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
