import {
  isAccountlessJwt,
  isServiceOnlyJwt,
  jwtHasRemainingValidityAtLeast,
  type Credentials,
} from '@openpeepshq/common';

/** Refresh when less than this many seconds remain (login JWTs are 1w). */
export const REFRESH_WHEN_REMAINING_BELOW_SEC = 24 * 60 * 60;
/** OAuth access tokens are short-lived; refresh before the window closes. */
export const OAUTH_REFRESH_BELOW_SEC = 5 * 60;

/**
 * What to do about the current session token, given the stored credentials.
 *
 * Pure decision, deliberately separated from the I/O in the OpenpeepsProvider
 * refresh effect so the branching can be unit-tested without a React tree, a
 * credentials store, or network calls.
 */
export type SessionRefreshDecision =
  | /** Token is healthy (or absent): do nothing until the next check. */
  {
      action: 'noop';
    } /** Token is dead (or a guest/service pass expired): drop the session. */
  | {
      action: 'end-session';
    } /** OAuth app login: hit the token endpoint with the stored refresh token. */
  | { action: 'oauth-refresh' } /** Plain login JWT: renew via /auth/refresh. */
  | { action: 'login-jwt-refresh' };

export const decideSessionRefresh = (
  credentials: Credentials | null | undefined,
): SessionRefreshDecision => {
  const token = credentials?.token;
  if (!token?.trim()) return { action: 'noop' };

  // OAuth app logins carry a short-lived access token plus a rotating
  // refresh token; they cannot use /auth/refresh.
  if (credentials?.refreshToken && credentials.clientId) {
    if (jwtHasRemainingValidityAtLeast(token, OAUTH_REFRESH_BELOW_SEC)) {
      return { action: 'noop' };
    }
    return { action: 'oauth-refresh' };
  }

  // Observer/egress service JWTs and guest passes are not refreshed via
  // /auth/refresh (guest TTL is 1d; the 24h login window would fire immediately).
  if (isServiceOnlyJwt(token) || isAccountlessJwt(token)) {
    if (!jwtHasRemainingValidityAtLeast(token, 1)) {
      return { action: 'end-session' };
    }
    return { action: 'noop' };
  }

  if (!jwtHasRemainingValidityAtLeast(token, 1)) {
    return { action: 'end-session' };
  }
  if (jwtHasRemainingValidityAtLeast(token, REFRESH_WHEN_REMAINING_BELOW_SEC)) {
    return { action: 'noop' };
  }
  return { action: 'login-jwt-refresh' };
};

/**
 * Is a failed OAuth token refresh definitive enough to end the session?
 *
 * A rejected grant (400) or a client that no longer exists (401
 * `invalid_client` — e.g. an admin deleted it) can never succeed by retrying,
 * so the session ends. Network errors and transient failures (no HTTP status,
 * or a 5xx) are not terminal: the caller retries on the next interval.
 */
export const isTerminalOAuthRefreshError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const { status, code } = error as { status?: number; code?: string };
  return status === 400 || (status === 401 && code === 'invalid_client');
};
