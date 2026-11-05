import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../config';
import {
  atprotoIngestEnabled,
  atprotoIsActive,
  hostnameOf,
  pdsHostAllowed,
} from './peers';

vi.mock('../config', () => ({ config: vi.fn() }));

const mockConfig = vi.mocked(config);

describe('atproto peers', () => {
  beforeEach(() => {
    mockConfig.mockReset();
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
