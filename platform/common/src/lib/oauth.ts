import {
  OAUTH_API_RESOURCE_TYPES,
  OAUTH_FULL_ACCESS_SCOPE,
  OIDC_SCOPES,
  type OAuthTokenResponse,
  type ProfileResourceType,
  type Scope,
} from '../types';

export const OAUTH_API_PATH = '/api/openpeeps/core/v1/oauth';

const apiScopePattern = new RegExp(
  `^(${OAUTH_API_RESOURCE_TYPES.join('|')}):(read|write)$`,
);

/** Space-delimited scope string → distinct scope tokens (RFC 6749 §3.3). */
export const parseOAuthScope = (scope?: string | null): string[] => [
  ...new Set((scope ?? '').split(' ').filter(Boolean)),
];

export const isKnownOAuthScope = (scope: string): boolean =>
  (OIDC_SCOPES as readonly string[]).includes(scope) ||
  scope === OAUTH_FULL_ACCESS_SCOPE ||
  apiScopePattern.test(scope);

/**
 * Maps granted OAuth scope tokens onto the JWT scope model. OIDC-only grants
 * still need one scope (the token tuple is non-empty), so they get read access
 * to the profile itself — enough for `/userinfo`, nothing else.
 */
export const oauthScopesToApiScopes = (
  scopes: string[],
  profileId: string,
): [Scope, ...Scope[]] => {
  const mapped = scopes.flatMap((scope): Scope[] => {
    if (scope === OAUTH_FULL_ACCESS_SCOPE) {
      return [{ scopeLevel: 'admin', resource: { type: '*', id: '*' } }];
    }
    const match = apiScopePattern.exec(scope);
    return match
      ? [
          {
            scopeLevel: match[2] as 'read' | 'write',
            resource: { type: match[1] as ProfileResourceType, id: '*' },
          },
        ]
      : [];
  });
  const [first, ...rest] = mapped;
  return first
    ? [first, ...rest]
    : [{ scopeLevel: 'read', resource: { type: 'self', id: profileId } }];
};

export const hasFullAccessScope = (scopes: Scope[] | undefined): boolean =>
  !!scopes?.some((s) => s.resource.type === '*' && s.scopeLevel === 'admin');

/**
 * For token checks outside the API middleware (plugin routes, downloads):
 * delegated tokens get through only with full access.
 */
export const isUndelegatedOrFullAccess = (authorization?: {
  identities?: { client?: string };
  scopes?: Scope[];
}): boolean =>
  !authorization?.identities?.client ||
  hasFullAccessScope(authorization.scopes);

const resourceBySegment: Record<string, ProfileResourceType> = {
  posts: 'posts',
  events: 'posts',
  profiles: 'profiles',
  groups: 'groups',
  jams: 'jams',
  conversations: 'conversations',
  reports: 'reports',
};

/**
 * Scope a delegated (OAuth-issued) token needs for an API request. API routes
 * mostly gate on role capabilities, not token scopes, so the authorization
 * middleware enforces delegated scopes centrally from the route's top-level
 * resource. `undefined` means no delegated scope covers the route.
 */
export const oauthRequiredScope = (
  method: string,
  pathname: string,
): Scope | undefined => {
  const prefix = '/api/openpeeps/core/v1/';
  if (!pathname.startsWith(prefix)) return undefined;
  const [first, second, third] = pathname.slice(prefix.length).split('/');
  const type =
    first === 'profiles' && second === 'current' && third === 'notifications'
      ? 'notifications'
      : resourceBySegment[first];
  if (!type) return undefined;
  const read = method === 'GET' || method === 'HEAD';
  return { scopeLevel: read ? 'read' : 'write', resource: { type, id: '*' } };
};

// React Native's URL and URLSearchParams are partial (no `search` setter), so
// the client helpers below build query strings by hand.
const trimSlash = (url: string) => url.replace(/\/+$/, '');
const formEncode = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

export const parseOAuthRedirect = (url: string): Record<string, string> =>
  Object.fromEntries(
    (url.split('#')[0].split('?')[1] ?? '')
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const [k, v = ''] = pair.split('=');
        const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, ' '));
        return [decode(k), decode(v)];
      }),
  );

export const buildOAuthAuthorizeUrl = ({
  serverUrl,
  clientId,
  redirectUri,
  scope,
  state,
  codeChallenge,
  nonce,
}: {
  serverUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  nonce?: string;
}): string =>
  `${trimSlash(serverUrl)}/oauth/authorize?${formEncode({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...(nonce ? { nonce } : {}),
  })}`;

/** POSTs a form-encoded grant to the token endpoint (RFC 6749 §4.1.3, §6). */
export const requestOAuthToken = async (
  serverUrl: string,
  params: Record<string, string>,
): Promise<OAuthTokenResponse> => {
  const response = await fetch(
    `${trimSlash(serverUrl)}${OAUTH_API_PATH}/token`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formEncode(params),
    },
  );
  const body = (await response.json()) as OAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!response.ok) {
    throw Object.assign(
      new Error(body.error_description ?? body.error ?? 'token request failed'),
      { status: response.status, code: body.error },
    );
  }
  return body;
};
