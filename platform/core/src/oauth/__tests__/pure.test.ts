import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import type {
  AccountWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { oidcClaims } from '../claims';
import { isValidCodeChallenge, verifyPkceS256 } from '../crypto';
import { oauthDiscoveryDocument } from '../discovery';
import { isAllowedRedirectUri, redirectUriMatches } from '../redirectUris';

const challengeFor = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url');

describe('PKCE S256', () => {
  const verifier = 'a'.repeat(43);

  it('accepts the matching verifier', () => {
    expect(verifyPkceS256(verifier, challengeFor(verifier))).toBe(true);
  });

  it('rejects a wrong or malformed verifier', () => {
    expect(verifyPkceS256('b'.repeat(43), challengeFor(verifier))).toBe(false);
    expect(verifyPkceS256('short', challengeFor('short'))).toBe(false);
  });

  it('only accepts 43-char base64url challenges', () => {
    expect(isValidCodeChallenge(challengeFor(verifier))).toBe(true);
    expect(isValidCodeChallenge('plain-verifier')).toBe(false);
  });
});

describe('redirect URIs', () => {
  it('allows https, loopback http and reverse-domain schemes', () => {
    expect(isAllowedRedirectUri('https://app.example/cb')).toBe(true);
    expect(isAllowedRedirectUri('http://127.0.0.1:8080/cb')).toBe(true);
    expect(isAllowedRedirectUri('http://[::1]/cb')).toBe(true);
    expect(isAllowedRedirectUri('org.openpeeps.app:/oauth')).toBe(true);
  });

  it('rejects plain http, script schemes and fragments', () => {
    expect(isAllowedRedirectUri('http://app.example/cb')).toBe(false);
    expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isAllowedRedirectUri('myapp:/cb')).toBe(false);
    expect(isAllowedRedirectUri('https://app.example/cb#x')).toBe(false);
    expect(isAllowedRedirectUri('not a uri')).toBe(false);
  });

  it('matches exactly, except for loopback ports', () => {
    const registered = ['https://app.example/cb', 'http://127.0.0.1/cb'];
    expect(redirectUriMatches(registered, 'https://app.example/cb')).toBe(true);
    expect(redirectUriMatches(registered, 'https://app.example/cb/')).toBe(
      false,
    );
    expect(redirectUriMatches(registered, 'https://app.example/cb?x=1')).toBe(
      false,
    );
    expect(redirectUriMatches(registered, 'http://127.0.0.1:53111/cb')).toBe(
      true,
    );
    expect(redirectUriMatches(registered, 'http://127.0.0.1:53111/other')).toBe(
      false,
    );
  });
});

describe('oidcClaims', () => {
  const profile = {
    id: 'p1',
    handle: 'ada',
    displayName: 'Ada',
    avatar: 'https://cdn.example/a.png',
  } as ProfileWithMeta;
  const account = {
    id: 'a1',
    email: 'ada@example.org',
    emailValidated: true,
  } as AccountWithMeta;

  it('withholds the email without the email scope', () => {
    expect(oidcClaims({ profile, account, scopes: ['openid'] })).toEqual({
      sub: 'p1',
    });
    expect(
      oidcClaims({ profile, account, scopes: ['openid', 'profile'] }),
    ).not.toHaveProperty('email');
  });

  it('releases profile and email claims per scope', () => {
    expect(
      oidcClaims({ profile, account, scopes: ['openid', 'profile', 'email'] }),
    ).toEqual({
      sub: 'p1',
      preferred_username: 'ada',
      name: 'Ada',
      picture: 'https://cdn.example/a.png',
      email: 'ada@example.org',
      email_verified: true,
    });
  });
});

describe('oauthDiscoveryDocument', () => {
  it('advertises registration only when enabled', () => {
    const issuer = 'https://peeps.example';
    const enabled = oauthDiscoveryDocument({
      issuer,
      registrationEnabled: true,
    });
    expect(enabled.registration_endpoint).toBe(
      `${issuer}/api/openpeeps/core/v1/oauth/register`,
    );
    expect(enabled.authorization_endpoint).toBe(`${issuer}/oauth/authorize`);
    expect(enabled.code_challenge_methods_supported).toEqual(['S256']);
    expect(
      oauthDiscoveryDocument({ issuer, registrationEnabled: false }),
    ).not.toHaveProperty('registration_endpoint');
  });
});
