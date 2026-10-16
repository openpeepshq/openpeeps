import { describe, expect, it } from 'vitest';
import {
  buildLivekitDiagnosis,
  probeLivekitConnection,
  probeLivekitConnectionResult,
  redactSecrets,
} from './health';

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
