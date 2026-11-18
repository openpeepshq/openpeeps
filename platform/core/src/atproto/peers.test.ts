import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../config';
import {
  atprotoIngestEnabled,
  atprotoIsActive,
  canIngestFrom,
  hostnameOf,
  pdsHostAllowed,
} from './peers';

vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('../redis/connection', () => ({
  getSharedConnection: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

const mockConfig = vi.mocked(config);

const didDoc = (pds: string) => ({
  id: 'did:web:actor.example',
  service: [
    {
      id: '#atproto_pds',
      type: 'AtprotoPersonalDataServer',
      serviceEndpoint: pds,
    },
  ],
});

// Stub the network fetch used by resolveDidDocument for did:web lookups
const stubDidFetch = (doc: unknown) => {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const href =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (href === 'https://actor.example/.well-known/did.json') {
      return new Response(JSON.stringify(doc), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('atproto peers', () => {
  beforeEach(() => {
    mockConfig.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses hosts and rejects invalid URLs', () => {
    expect(hostnameOf('https://Pds.Example/xrpc')).toBe('pds.example');
    expect(hostnameOf('not-a-url')).toBeNull();
  });

  it('fails closed when the allowlist is empty', async () => {
    mockConfig.mockResolvedValue({
      atproto: { allowedPdsHosts: [], active: true, ingestEnabled: true },
    } as never);
    expect(await pdsHostAllowed('https://pds.example')).toBe(false);
    expect(await pdsHostAllowed(null)).toBe(false);
  });

  it('allows listed PDS hosts', async () => {
    mockConfig.mockResolvedValue({
      atproto: {
        allowedPdsHosts: ['pds.example', '*.good.test'],
        active: true,
        ingestEnabled: true,
      },
    } as never);
    expect(await pdsHostAllowed('https://pds.example')).toBe(true);
    expect(await pdsHostAllowed('peer.good.test')).toBe(true);
    expect(await pdsHostAllowed('https://evil.test')).toBe(false);
  });

  it('gates ingest on both active and ingestEnabled', async () => {
    mockConfig.mockResolvedValue({
      atproto: { active: true, ingestEnabled: false },
    } as never);
    expect(await atprotoIsActive()).toBe(true);
    expect(await atprotoIngestEnabled()).toBe(false);
  });
});

describe('canIngestFrom (DID-doc host match guard)', () => {
  beforeEach(() => {
    mockConfig.mockReset();
    mockConfig.mockResolvedValue({
      atproto: {
        allowedPdsHosts: ['pds.example'],
        active: true,
        ingestEnabled: true,
      },
    } as never);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects commits whose DID PDS does not match the source host', async () => {
    stubDidFetch(didDoc('https://elsewhere.test'));
    const result = await canIngestFrom(
      'did:web:actor.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('accepts a DID whose PDS matches the allowlisted source host', async () => {
    stubDidFetch(didDoc('https://pds.example'));
    const result = await canIngestFrom(
      'did:web:actor.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(true);
  });

  it('rejects when the DID document lacks an atproto_pds service', async () => {
    stubDidFetch({ id: 'did:web:actor.example' });
    const result = await canIngestFrom(
      'did:web:actor.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('atproto_pds');
  });

  it('rejects when the DID document cannot be resolved', async () => {
    stubDidFetch(null);
    const result = await canIngestFrom(
      'did:web:actor.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('could not resolve');
  });

  it('rejects commits from a source host that is not allowlisted', async () => {
    stubDidFetch(didDoc('https://pds.example'));
    const result = await canIngestFrom(
      'did:web:actor.example',
      'https://evil.test',
      'evil.test',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not allowlisted');
  });
});
