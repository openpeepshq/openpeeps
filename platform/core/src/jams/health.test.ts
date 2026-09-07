import { describe, expect, it } from 'vitest';
import { probeLivekitConnection } from './health';

describe('probeLivekitConnection', () => {
  it('returns true when listRooms resolves', async () => {
    expect(await probeLivekitConnection(() => Promise.resolve([]))).toBe(true);
  });

  it('returns false when listRooms rejects', async () => {
    expect(
      await probeLivekitConnection(() =>
        Promise.reject(new Error('unauthorized')),
      ),
    ).toBe(false);
  });

  it('returns false when listRooms exceeds the timeout', async () => {
    expect(
      await probeLivekitConnection(() => new Promise(() => undefined), 20),
    ).toBe(false);
  });
});
