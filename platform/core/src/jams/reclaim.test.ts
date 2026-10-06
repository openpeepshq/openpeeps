import { describe, expect, it } from 'vitest';
import { shouldReclaimJamRoom } from './livekit';

describe('shouldReclaimJamRoom', () => {
  it('leaves an empty room alone so a host can finish connecting', () => {
    expect(shouldReclaimJamRoom(0, 0)).toBe(false);
  });

  it('leaves a room with people in it alone', () => {
    expect(shouldReclaimJamRoom(2, 2)).toBe(false);
  });

  it('reclaims a room held open only by egress', () => {
    expect(shouldReclaimJamRoom(1, 0)).toBe(true);
  });
});
