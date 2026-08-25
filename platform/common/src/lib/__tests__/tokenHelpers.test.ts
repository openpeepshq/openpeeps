import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { isAccountlessJwt, isServiceOnlyJwt } from '../tokenHelpers';

const unsignedJwt = async (identities: {
  profile?: string;
  account?: string;
  service?: string;
}) =>
  new SignJWT({ identities, scopes: [] })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new TextEncoder().encode('test'));

describe('isServiceOnlyJwt', () => {
  it('is true for service without profile', async () => {
    expect(
      isServiceOnlyJwt(await unsignedJwt({ service: 'observer' })),
    ).toBe(true);
  });

  it('is false for profile tokens', async () => {
    expect(
      isServiceOnlyJwt(await unsignedJwt({ profile: 'p1', account: 'a1' })),
    ).toBe(false);
  });
});

describe('isAccountlessJwt', () => {
  it('is true for guest profile without account', async () => {
    expect(isAccountlessJwt(await unsignedJwt({ profile: 'guest-1' }))).toBe(
      true,
    );
  });

  it('is false for login tokens with account', async () => {
    expect(
      isAccountlessJwt(await unsignedJwt({ profile: 'p1', account: 'a1' })),
    ).toBe(false);
  });

  it('is false for service-only tokens', async () => {
    expect(
      isAccountlessJwt(await unsignedJwt({ service: 'observer' })),
    ).toBe(false);
  });

  it('is false for empty/invalid tokens', () => {
    expect(isAccountlessJwt(undefined)).toBe(false);
    expect(isAccountlessJwt('')).toBe(false);
    expect(isAccountlessJwt('not-a-jwt')).toBe(false);
  });
});
