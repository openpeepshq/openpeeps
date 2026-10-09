import { describe, expect, it } from 'vitest';
import { probeLivekitConnection } from './health';

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
