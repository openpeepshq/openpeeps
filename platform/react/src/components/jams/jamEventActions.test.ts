import { describe, expect, it } from 'vitest';
import type { PublicProfile } from '@openpeepshq/common/types';
import { participantTileProfile } from './jamEventActions';

const signedIn = {
  id: '11111111-1111-4111-8111-111111111111',
  handle: 'member',
  displayName: 'Member Test',
  avatar: 'https://example.com/member.png',
} as PublicProfile;

const remote = {
  id: '22222222-2222-4222-8222-222222222222',
  handle: 'host',
  displayName: 'Host',
} as PublicProfile;

describe('participantTileProfile', () => {
  it('uses the signed-in profile while the local participant has no metadata', () => {
    expect(
      participantTileProfile({ isLocal: true, metadata: undefined }, signedIn),
    ).toBe(signedIn);
    expect(
      participantTileProfile({ isLocal: true, metadata: '' }, signedIn),
    ).toBe(signedIn);
    expect(
      participantTileProfile({ isLocal: true, metadata: '{}' }, signedIn),
    ).toBe(signedIn);
  });

  it('keeps a remote tile empty until that participant publishes a profile', () => {
    expect(
      participantTileProfile({ isLocal: false, metadata: undefined }, signedIn),
    ).toBeUndefined();
  });

  it('prefers the profile LiveKit has already attached', () => {
    const metadata = JSON.stringify({ profile: remote });
    expect(
      participantTileProfile({ isLocal: true, metadata }, signedIn),
    ).toEqual(remote);
    expect(
      participantTileProfile({ isLocal: false, metadata }, signedIn),
    ).toEqual(remote);
  });
});
