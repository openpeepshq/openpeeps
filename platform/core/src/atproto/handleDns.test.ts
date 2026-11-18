import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleTxtName, handleTxtRecord } from './crawl';
import * as configModule from '../config';
import { publishHandleTxt } from './handleDns';

describe('atproto handle DNS', () => {
  beforeEach(() => {
    vi.spyOn(configModule, 'config');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('names the TXT record _atproto.{handle}', () => {
    expect(handleTxtName('alice.community.example')).toBe(
      '_atproto.alice.community.example',
    );
    expect(
      handleTxtRecord('did:web:community.example:atproto:users:alice'),
    ).toBe('did=did:web:community.example:atproto:users:alice');
  });

  it('upserts a Cloudflare TXT record', async () => {
    vi.mocked(configModule.config).mockResolvedValue({
      atproto: {
        active: true,
        handleDomain: 'community.example',
        handleDns: {
          enabled: true,
          provider: 'cloudflare',
          apiToken: 'cf-token',
        },
      },
    } as never);
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('/zones?name=')) {
        return new Response(JSON.stringify({ result: [{ id: 'zone-1' }] }));
      }
      if (url.includes('/dns_records?type=TXT')) {
        return new Response(JSON.stringify({ result: [] }));
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const published = await publishHandleTxt({
      atHandle: 'alice.community.example',
      did: 'did:web:community.example:atproto:users:alice',
    });
    expect(published?.name).toBe('_atproto.alice.community.example');
    expect(published?.provider).toBe('cloudflare');
    const create = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/dns_records') && init?.method === 'POST',
    );
    expect(create).toBeTruthy();
    expect(JSON.parse(String(create?.[1]?.body))).toMatchObject({
      type: 'TXT',
      name: '_atproto.alice.community.example',
      content: 'did=did:web:community.example:atproto:users:alice',
    });
  });

  it('skips publish when handle DNS is off', async () => {
    vi.mocked(configModule.config).mockResolvedValue({
      atproto: {
        active: true,
        handleDomain: 'community.example',
        handleDns: { enabled: false, provider: 'cloudflare' },
      },
    } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      publishHandleTxt({
        atHandle: 'alice.community.example',
        did: 'did:web:x',
      }),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
