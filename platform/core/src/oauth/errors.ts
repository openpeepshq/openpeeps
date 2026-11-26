/** RFC 6749 §4.1.2.1 / §5.2, RFC 7591 §3.2.2 and RFC 6750 §3.1 error codes. */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_scope'
  | 'invalid_token'
  | 'insufficient_scope'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'access_denied'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'registration_disabled';

export type OAuthError = Error & { oauthError: OAuthErrorCode };

export const oauthError = (
  code: OAuthErrorCode,
  description: string,
): OAuthError => Object.assign(new Error(description), { oauthError: code });

export const isOAuthError = (error: unknown): error is OAuthError =>
  error instanceof Error && 'oauthError' in error;
