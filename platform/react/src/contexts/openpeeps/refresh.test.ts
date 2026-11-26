import { describe, expect, it } from 'vitest';
import {
  OAUTH_REFRESH_BELOW_SEC,
  REFRESH_WHEN_REMAINING_BELOW_SEC,
  decideSessionRefresh,
  isTerminalOAuthRefreshError,
} from './refresh';
import type { Credentials } from '@openpeepshq/common';

// Builds an unverified JWT (header.payload.signature) that `decodeJwt` can read.
// The payload shape mirrors the Authorization claim set the helpers inspect
// (identities + a numeric exp); the signature is never checked by the decision.
const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url');
const makeJwt = (payload: Record<string, unknown>) =>
  `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.sig`;

const nowSec = () => Math.floor(Date.now() / 1000);
// A normal logged-in JWT: profile + account identities, given expiry offset.
const loginJwt = (expOffsetSec: number) =>
  makeJwt({
    identities: { profile: 'p1', account: 'a1' },
    scopes: [],
    exp: nowSec() + expOffsetSec,
  });
const serviceJwt = (expOffsetSec: number) =>
  makeJwt({
    identities: { service: 's1' },
    scopes: [],
    exp: nowSec() + expOffsetSec,
  });
const guestJwt = (expOffsetSec: number) =>
  makeJwt({
    identities: { profile: 'p1' },
    scopes: [],
    exp: nowSec() + expOffsetSec,
  });

describe('decideSessionRefresh', () => {
  it('is a no-op when there are no credentials or an empty token', () => {
    expect(decideSessionRefresh(null)).toEqual({ action: 'noop' });
    expect(
      decideSessionRefresh({ token: '   ' } satisfies Credentials),
    ).toEqual({ action: 'noop' });
  });

  describe('OAuth app logins (short-lived access + rotating refresh token)', () => {
    const creds = (token: string): Credentials => ({
      token,
      refreshToken: 'rotating-refresh',
      clientId: 'client-1',
    });

    it('does nothing while the access token still has plenty of life', () => {
      expect(decideSessionRefresh(creds(loginJwt(10 * 60)))).toEqual({
        action: 'noop',
      });
    });

    it('refreshes via the token endpoint once below the OAuth window', () => {
      expect(
        decideSessionRefresh(creds(loginJwt(OAUTH_REFRESH_BELOW_SEC - 30))),
      ).toEqual({ action: 'oauth-refresh' });
    });

    it('still refreshes a freshly-expired access token', () => {
      expect(decideSessionRefresh(creds(loginJwt(-5)))).toEqual({
        action: 'oauth-refresh',
      });
    });
  });

  describe('service-only JWTs (jam observer / egress)', () => {
    it('does nothing while valid', () => {
      expect(decideSessionRefresh({ token: serviceJwt(10 * 60) })).toEqual({
        action: 'noop',
      });
    });

    it('ends the session once the service JWT expires', () => {
      expect(decideSessionRefresh({ token: serviceJwt(-10) })).toEqual({
        action: 'end-session',
      });
    });
  });

  describe('guest passes (accountless JWTs)', () => {
    it('does nothing while valid', () => {
      expect(decideSessionRefresh({ token: guestJwt(10 * 60) })).toEqual({
        action: 'noop',
      });
    });

    it('ends the session once the guest pass expires', () => {
      expect(decideSessionRefresh({ token: guestJwt(-10) })).toEqual({
        action: 'end-session',
      });
    });
  });

  describe('plain login JWTs', () => {
    it('does nothing while a full login window remains', () => {
      expect(
        decideSessionRefresh({
          token: loginJwt(2 * REFRESH_WHEN_REMAINING_BELOW_SEC),
        }),
      ).toEqual({ action: 'noop' });
    });

    it('ends the session once expired', () => {
      expect(decideSessionRefresh({ token: loginJwt(-10) })).toEqual({
        action: 'end-session',
      });
    });

    it('renews via /auth/refresh when below the refresh window but not expired', () => {
      // 1 hour left: past expiry, but below the 24h "refresh soon" threshold.
      expect(decideSessionRefresh({ token: loginJwt(60 * 60) })).toEqual({
        action: 'login-jwt-refresh',
      });
    });
  });
});

describe('isTerminalOAuthRefreshError', () => {
  // The round-1 regression: a client an admin deleted fails with
  // `401 invalid_client` — it must end the session rather than retry forever.
  it('is terminal for a rejected grant (400)', () => {
    expect(
      isTerminalOAuthRefreshError({ status: 400, code: 'invalid_grant' }),
    ).toBe(true);
  });

  it('is terminal for a deleted client (401 invalid_client)', () => {
    expect(
      isTerminalOAuthRefreshError({ status: 401, code: 'invalid_client' }),
    ).toBe(true);
  });

  it('is not terminal for a 401 with any other error code', () => {
    expect(
      isTerminalOAuthRefreshError({ status: 401, code: 'unauthorized' }),
    ).toBe(false);
  });

  it('is not terminal for transient server errors (5xx)', () => {
    expect(isTerminalOAuthRefreshError({ status: 500, code: undefined })).toBe(
      false,
    );
    expect(
      isTerminalOAuthRefreshError({ status: 503, code: 'server_error' }),
    ).toBe(false);
  });

  it('is not terminal for network errors without an HTTP status', () => {
    expect(isTerminalOAuthRefreshError(new TypeError('fetch failed'))).toBe(
      false,
    );
    expect(isTerminalOAuthRefreshError(undefined)).toBe(false);
    expect(isTerminalOAuthRefreshError(null)).toBe(false);
  });
});
