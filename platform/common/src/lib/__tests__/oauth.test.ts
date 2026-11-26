import { describe, expect, it } from 'vitest';
import {
  buildOAuthAuthorizeUrl,
  hasFullAccessScope,
  isKnownOAuthScope,
  oauthRequiredScope,
  oauthScopesToApiScopes,
  parseOAuthRedirect,
  parseOAuthScope,
} from '../oauth';

describe('parseOAuthScope', () => {
  it('splits on spaces and drops duplicates and empties', () => {
    expect(parseOAuthScope('openid  posts:read openid')).toEqual([
      'openid',
      'posts:read',
    ]);
    expect(parseOAuthScope(undefined)).toEqual([]);
  });
});

describe('isKnownOAuthScope', () => {
  it('accepts OIDC, resource and full-access scopes only', () => {
    expect(isKnownOAuthScope('openid')).toBe(true);
    expect(isKnownOAuthScope('offline_access')).toBe(true);
    expect(isKnownOAuthScope('posts:write')).toBe(true);
    expect(isKnownOAuthScope('*:admin')).toBe(true);
    expect(isKnownOAuthScope('posts:admin')).toBe(false);
    expect(isKnownOAuthScope('db:read')).toBe(false);
    expect(isKnownOAuthScope('*:read')).toBe(false);
  });
});

describe('oauthScopesToApiScopes', () => {
  it('maps resource scopes and ignores OIDC scopes', () => {
    expect(
      oauthScopesToApiScopes(['openid', 'posts:read', 'groups:write'], 'p1'),
    ).toEqual([
      { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
      { scopeLevel: 'write', resource: { type: 'groups', id: '*' } },
    ]);
  });

  it('maps the full-access scope to admin on everything', () => {
    const scopes = oauthScopesToApiScopes(['*:admin'], 'p1');
    expect(hasFullAccessScope(scopes)).toBe(true);
  });

  it('falls back to reading the own profile for OIDC-only grants', () => {
    const scopes = oauthScopesToApiScopes(['openid', 'email'], 'p1');
    expect(scopes).toEqual([
      { scopeLevel: 'read', resource: { type: 'self', id: 'p1' } },
    ]);
    expect(hasFullAccessScope(scopes)).toBe(false);
  });
});

describe('oauthRequiredScope', () => {
  const api = '/api/openpeeps/core/v1';

  it('derives level from the method and type from the route', () => {
    expect(oauthRequiredScope('GET', `${api}/posts/abc`)).toEqual({
      scopeLevel: 'read',
      resource: { type: 'posts', id: '*' },
    });
    expect(oauthRequiredScope('POST', `${api}/events/abc/rsvp`)).toEqual({
      scopeLevel: 'write',
      resource: { type: 'posts', id: '*' },
    });
    expect(
      oauthRequiredScope('PUT', `${api}/profiles/current/notifications/x`),
    ).toEqual({
      scopeLevel: 'write',
      resource: { type: 'notifications', id: '*' },
    });
  });

  it('leaves admin, auth, account and oauth routes uncovered', () => {
    for (const path of ['admin/config', 'auth/refresh', 'accounts/current']) {
      expect(oauthRequiredScope('GET', `${api}/${path}`)).toBeUndefined();
    }
    expect(oauthRequiredScope('POST', `${api}/oauth/authorize`)).toBe(
      undefined,
    );
    expect(oauthRequiredScope('GET', '/somewhere/else')).toBeUndefined();
  });
});

describe('buildOAuthAuthorizeUrl', () => {
  it('builds a PKCE S256 authorization request on the SPA route', () => {
    const url = new URL(
      buildOAuthAuthorizeUrl({
        serverUrl: 'https://peeps.example/',
        clientId: 'c1',
        redirectUri: 'org.example.app:/cb',
        scope: 'openid offline_access',
        state: 's',
        codeChallenge: 'x'.repeat(43),
      }),
    );
    expect(url.origin + url.pathname).toBe(
      'https://peeps.example/oauth/authorize',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'c1',
      redirect_uri: 'org.example.app:/cb',
      scope: 'openid offline_access',
      state: 's',
      code_challenge: 'x'.repeat(43),
      code_challenge_method: 'S256',
    });
  });
});

describe('parseOAuthRedirect', () => {
  it('decodes the query of a custom-scheme redirect and ignores the fragment', () => {
    expect(
      parseOAuthRedirect('org.example.app:/cb?code=a%2Bb&state=s+1#frag'),
    ).toEqual({ code: 'a+b', state: 's 1' });
  });

  it('returns an empty object without a query', () => {
    expect(parseOAuthRedirect('org.example.app:/cb')).toEqual({});
  });
});
