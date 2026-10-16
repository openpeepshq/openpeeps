import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoreConfig } from '@openpeepshq/common/types';
import {
  buildLivekitDiagnosis,
  diagnoseLivekit,
  probeLivekitConnection,
  probeLivekitConnectionResult,
  redactSecrets,
} from './health';

vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('./livekit', () => ({ roomService: vi.fn() }));

import { config } from '../config';
import { roomService } from './livekit';

const mockConfig = vi.mocked(config);
const mockRoomService = vi.mocked(roomService);

const fakeConfig = (livekit: {
  url?: string;
  apiKey?: string;
  apiSecret?: string;
  recordingEnabled?: boolean;
}): CoreConfig => ({ jams: { livekit } }) as unknown as CoreConfig;

const fakeRoomService = (listRooms: ReturnType<typeof vi.fn>) =>
  ({ listRooms }) as unknown as Awaited<ReturnType<typeof roomService>>;

describe('probeLivekitConnection', () => {
  it('returns true when listRooms resolves, without retrying', async () => {
    let calls = 0;
    const listRooms = () => {
      calls++;
      return Promise.resolve([]);
    };
    expect(await probeLivekitConnection(listRooms)).toBe(true);
    expect(calls).toBe(1);
  });

  it('retries and returns true when a later attempt succeeds', async () => {
    let calls = 0;
    const listRooms = () => {
      calls++;
      return calls === 1
        ? Promise.reject(new Error('timed out'))
        : Promise.resolve([]);
    };
    expect(await probeLivekitConnection(listRooms)).toBe(true);
    expect(calls).toBe(2);
  });

  it('returns false after exhausting all attempts when listRooms rejects', async () => {
    let calls = 0;
    const listRooms = () => {
      calls++;
      return Promise.reject(new Error('unauthorized'));
    };
    expect(await probeLivekitConnection(listRooms)).toBe(false);
    expect(calls).toBe(3);
  });

  it('returns false after exhausting all attempts when listRooms exceeds the timeout', async () => {
    let calls = 0;
    const listRooms = () => {
      calls++;
      return new Promise(() => undefined);
    };
    expect(await probeLivekitConnection(listRooms, 20)).toBe(false);
    expect(calls).toBe(3);
  });
});

describe('probeLivekitConnectionResult', () => {
  it('returns the last error after retries are exhausted', async () => {
    const listRooms = () => Promise.reject(new Error('unauthorized'));
    const result = await probeLivekitConnectionResult(listRooms, 20, 2);
    expect(result).toEqual({ ok: false, error: 'unauthorized' });
  });
});

describe('redactSecrets', () => {
  it('replaces credential values that show up in an error', () => {
    expect(
      redactSecrets('rejected key supersecretvalue', ['supersecretvalue']),
    ).toBe('rejected key [redacted]');
  });

  it('leaves short tokens alone so unrelated text is not stripped', () => {
    expect(redactSecrets('bad key ab', ['ab'])).toBe('bad key ab');
  });
});

describe('buildLivekitDiagnosis', () => {
  it('reports which credentials are missing without a probe error', () => {
    expect(
      buildLivekitDiagnosis({
        url: 'https://livekit.example',
        hasApiKey: false,
        hasApiSecret: true,
        recordingEnabled: false,
        reachable: false,
        error: 'should not surface',
      }),
    ).toEqual({
      connected: false,
      recordingEnabled: false,
      url: 'https://livekit.example',
      checks: [
        { id: 'url', ok: true },
        { id: 'apiKey', ok: false },
        { id: 'apiSecret', ok: true },
        { id: 'reachable', ok: false },
      ],
    });
  });

  it('includes the probe error when credentials are set but the server rejects them', () => {
    expect(
      buildLivekitDiagnosis({
        url: 'https://livekit.example',
        hasApiKey: true,
        hasApiSecret: true,
        recordingEnabled: true,
        reachable: false,
        error: 'unauthorized',
      }),
    ).toMatchObject({
      connected: false,
      recordingEnabled: true,
      error: 'unauthorized',
      checks: [
        { id: 'url', ok: true },
        { id: 'apiKey', ok: true },
        { id: 'apiSecret', ok: true },
        { id: 'reachable', ok: false },
      ],
    });
  });

  it('marks the server reachable only when the probe succeeds', () => {
    expect(
      buildLivekitDiagnosis({
        url: 'https://livekit.example',
        hasApiKey: true,
        hasApiSecret: true,
        recordingEnabled: false,
        reachable: true,
      }).connected,
    ).toBe(true);
  });
});

describe('diagnoseLivekit', () => {
  beforeEach(() => {
    mockConfig.mockReset();
    mockRoomService.mockReset();
  });

  it('reports missing credentials without probing LiveKit', async () => {
    mockConfig.mockResolvedValue(
      fakeConfig({ url: undefined, apiKey: undefined, apiSecret: undefined }),
    );
    mockRoomService.mockResolvedValue(fakeRoomService(vi.fn()));

    const diagnosis = await diagnoseLivekit();

    expect(diagnosis.connected).toBe(false);
    expect(diagnosis.error).toBeUndefined();
    expect(diagnosis.url).toBeUndefined();
    expect(diagnosis.checks).toEqual([
      { id: 'url', ok: false },
      { id: 'apiKey', ok: false },
      { id: 'apiSecret', ok: false },
      { id: 'reachable', ok: false },
    ]);
    expect(mockRoomService).not.toHaveBeenCalled();
  });

  it('reports connected when the probe succeeds', async () => {
    mockConfig.mockResolvedValue(
      fakeConfig({
        url: 'https://livekit.example',
        apiKey: 'key-12345678',
        apiSecret: 'secret-12345678',
        recordingEnabled: true,
      }),
    );
    const listRooms = vi.fn().mockResolvedValue([]);
    mockRoomService.mockResolvedValue(fakeRoomService(listRooms));

    const diagnosis = await diagnoseLivekit();

    expect(diagnosis.connected).toBe(true);
    expect(diagnosis.error).toBeUndefined();
    expect(diagnosis.url).toBe('https://livekit.example');
    expect(diagnosis.recordingEnabled).toBe(true);
    expect(diagnosis.checks[3]).toEqual({ id: 'reachable', ok: true });
    expect(listRooms).toHaveBeenCalled();
  });

  it('redacts credentials from the last probe error', async () => {
    const apiKey = 'key-12345678';
    const apiSecret = 'secret-12345678';
    mockConfig.mockResolvedValue(
      fakeConfig({
        url: 'https://livekit.example',
        apiKey,
        apiSecret,
        recordingEnabled: false,
      }),
    );
    const listRooms = vi
      .fn()
      .mockRejectedValue(
        new Error(`auth failed using ${apiKey} and ${apiSecret}`),
      );
    mockRoomService.mockResolvedValue(fakeRoomService(listRooms));

    const diagnosis = await diagnoseLivekit();

    expect(diagnosis.connected).toBe(false);
    expect(diagnosis.checks[3]).toEqual({ id: 'reachable', ok: false });
    expect(diagnosis.error).toBe('auth failed using [redacted] and [redacted]');
    expect(diagnosis.error).not.toContain(apiKey);
    expect(diagnosis.error).not.toContain(apiSecret);
  });
});
