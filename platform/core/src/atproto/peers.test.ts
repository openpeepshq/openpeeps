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

const didDoc = (id: string, pds: string) => ({
  id,
  service: [
    {
      id: '#atproto_pds',
      type: 'AtprotoPersonalDataServer',
      serviceEndpoint: pds,
    },
  ],
});

// Stub the network fetch used by resolveDidDocument for did:web lookups:
// answers the did.json of whatever did:web host is requested.
const stubDidFetch = (doc: unknown) => {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const href =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (href.endsWith('/.well-known/did.json')) {
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
    stubDidFetch(didDoc('did:web:pds.example', 'https://elsewhere.test'));
    const result = await canIngestFrom(
      'did:web:pds.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('accepts a DID whose PDS matches the allowlisted source host', async () => {
    stubDidFetch(didDoc('did:web:pds.example', 'https://pds.example'));
    const result = await canIngestFrom(
      'did:web:pds.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(true);
  });

  it('rejects did:web commits whose DID authority differs from the committing PDS host', async () => {
    // The did:web host is attacker-controlled: the DID document it serves
    // can name the allowlisted PDS, but the DID's method authority (its own
    // web host) must still be part of the committing source host, or the
    // commit would be attributed to an identity that host never said so.
    stubDidFetch(didDoc('did:web:attacker.example', 'https://pds.example'));
    const result = await canIngestFrom(
      'did:web:attacker.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('did:web authority');
  });

  it('rejects when the DID document lacks an atproto_pds service', async () => {
    stubDidFetch({ id: 'did:web:pds.example' });
    const result = await canIngestFrom(
      'did:web:pds.example',
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
      'did:web:pds.example',
      'https://pds.example',
      'pds.example',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('could not resolve');
  });

  it('rejects commits from a source host that is not allowlisted', async () => {
    stubDidFetch(didDoc('did:web:pds.example', 'https://pds.example'));
    const result = await canIngestFrom(
      'did:web:pds.example',
      'https://evil.test',
      'evil.test',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not allowlisted');
  });

  it('rejects DIDs whose PDS belongs to our own handle domain (loop prevention)', async () => {
    // Allowlist the own-domain PDS so the guard reaches step 3: a community
    // profile's commit arriving from our own PDS must not be re-ingested.
    mockConfig.mockResolvedValue({
      atproto: {
        allowedPdsHosts: ['pds.example', 'pds.peep.test'],
        active: true,
        ingestEnabled: true,
      },
    } as never);
    stubDidFetch(didDoc('did:web:pds.peep.test', 'https://pds.peep.test'));
    const result = await canIngestFrom(
      'did:web:pds.peep.test',
      'https://pds.peep.test',
      'pds.peep.test',
      '.peep.test',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('own domain');
  });
});
