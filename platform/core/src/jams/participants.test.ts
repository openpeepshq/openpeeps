import { describe, expect, it } from 'vitest';
import { isEgressIdentity, splitJamParticipants } from './livekit';

describe('splitJamParticipants', () => {
  it('returns zero observers and no humans for an empty room', () => {
    expect(splitJamParticipants([])).toEqual({ humans: [], observers: 0 });
  });

  it('counts a single hidden external session', () => {
    expect(splitJamParticipants(['EG_abc-123'])).toEqual({
      humans: [],
      observers: 1,
    });
  });

  it('counts many external sessions and keeps human identities', () => {
    expect(
      splitJamParticipants(['EG_a', 'user-1', 'EG_b', 'user-2', 'user-3']),
    ).toEqual({ humans: ['user-1', 'user-2', 'user-3'], observers: 2 });
  });

  it('returns zero observers when only humans are connected', () => {
    expect(splitJamParticipants(['user-1'])).toEqual({
      humans: ['user-1'],
      observers: 0,
    });
  });

  it('treats only the EG_ prefix as egress', () => {
    expect(isEgressIdentity('EG_x')).toBe(true);
    expect(isEgressIdentity('eg_x')).toBe(false);
    expect(isEgressIdentity('USER_EG_x')).toBe(false);
  });
});
