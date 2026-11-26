import { createHash } from 'crypto';
import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify } from 'jose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The signing module reads its persisted RSA key through `allpeepDb()`; the
// fake answers every select with a key generated once for the suite.
const state = vi.hoisted(() => ({ privateJwk: undefined as unknown }));
vi.mock('../../db', () => ({
  allpeepDb: async () => {
    const chain = {
      from: () => chain,
      where: () => chain,
      limit: async () => [{ body: { privateJwk: state.privateJwk } }],
    };
    return { db: { select: () => chain } };
  },
}));
vi.mock('../codes', () => ({ redeemOAuthAuthorizationCode: vi.fn() }));
vi.mock('../grants', () => ({ findOAuthGrant: vi.fn() }));
vi.mock('../refreshTokens', () => ({
  consumeOAuthRefreshToken: vi.fn(),
  findOAuthRefreshToken: vi.fn(),
  issueOAuthRefreshToken: vi.fn(async () => 'refresh2'),
  revokeOAuthRefreshTokenFamily: vi.fn(),
}));
vi.mock('../../accessTokens/tokens', () => ({
  createSignedAccessToken: vi.fn(async () => ({
    id: 'jti1',
    signedToken: 'access.jwt',
  })),
  verifySignedAccessToken: vi.fn(),
}));
vi.mock('../../accessTokens/mutations', () => ({ revokeAccessToken: vi.fn() }));
vi.mock('../../jwt', () => ({ jwtUtil: vi.fn() }));
vi.mock('../../profiles/finders', () => ({
  findProfile: vi.fn(async () => ({ id: 'p1', handle: 'ada' })),
}));
vi.mock('../../accounts/finders', () => ({
  findAccount: vi.fn(async () => ({
    id: 'a1',
    email: 'ada@example.org',
    emailValidated: true,
  })),
}));

import {
  createSignedAccessToken,
  verifySignedAccessToken,
} from '../../accessTokens/tokens';
import { revokeAccessToken } from '../../accessTokens/mutations';
import { findAccount } from '../../accounts/finders';
import { jwtUtil } from '../../jwt';
import { redeemOAuthAuthorizationCode } from '../codes';
import { findOAuthGrant } from '../grants';
import {
  consumeOAuthRefreshToken,
  findOAuthRefreshToken,
  issueOAuthRefreshToken,
  revokeOAuthRefreshTokenFamily,
} from '../refreshTokens';
import { oauthJwks } from '../signing';
import {
  exchangeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken,
  oauthUserinfo,
  revokeOAuthToken,
} from '../tokens';
import type { OAuthClientRecord } from '../clients';

const issuer = 'https://peeps.example';
const verifier = 'v'.repeat(64);
const client: OAuthClientRecord = {
  id: 'c1',
  name: 'App',
  redirectUris: ['org.example.app:/cb'],
  confidential: false,
  firstParty: false,
  dynamic: false,
  createdAt: '',
  secretHash: null,
  secretExpiresAt: null,
};
const codeData = {
  clientId: 'c1',
  redirectUri: 'org.example.app:/cb',
  profileId: 'p1',
  accountId: 'a1',
  scopes: ['openid', 'email', 'offline_access', 'posts:read'],
  codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
  nonce: 'nonce-1',
  authTime: 1_790_000_000,
};
const exchange = (overrides: Record<string, string> = {}) =>
  exchangeOAuthAuthorizationCode({
    issuer,
    client,
    code: 'code1',
    redirectUri: 'org.example.app:/cb',
    codeVerifier: verifier,
    ...overrides,
  });

beforeAll(async () => {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  state.privateJwk = await exportJWK(privateKey);
});

beforeEach(() => {
  vi.mocked(redeemOAuthAuthorizationCode)
    .mockReset()
    .mockResolvedValueOnce(codeData)
    .mockResolvedValue(undefined);
  vi.mocked(createSignedAccessToken).mockClear();
  vi.mocked(issueOAuthRefreshToken).mockClear();
});

describe('authorization_code grant', () => {
  it('issues access, refresh and a verifiable id_token', async () => {
    const response = await exchange();
    expect(response).toMatchObject({
      access_token: 'access.jwt',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh2',
      scope: 'openid email offline_access posts:read',
    });
    expect(
      vi.mocked(createSignedAccessToken).mock.calls[0][0].authorization,
    ).toEqual({
      identities: { profile: 'p1', account: 'a1', client: 'c1' },
      scopes: [{ scopeLevel: 'read', resource: { type: 'posts', id: '*' } }],
    });

    const { payload, protectedHeader } = await jwtVerify(
      response.id_token!,
      createLocalJWKSet(await oauthJwks()),
      { issuer, audience: 'c1' },
    );
    expect(protectedHeader.alg).toBe('RS256');
    expect(payload).toMatchObject({
      sub: 'p1',
      azp: 'c1',
      nonce: 'nonce-1',
      auth_time: 1_790_000_000,
      email: 'ada@example.org',
      email_verified: true,
    });
    expect(payload).not.toHaveProperty('preferred_username');
  });

  it('accepts a code only once', async () => {
    await exchange();
    await expect(exchange()).rejects.toMatchObject({
      oauthError: 'invalid_grant',
    });
  });

  it('rejects a wrong PKCE verifier', async () => {
    await expect(
      exchange({ codeVerifier: 'w'.repeat(64) }),
    ).rejects.toMatchObject({ message: 'PKCE verification failed' });
  });

  it('rejects a different redirect URI or client', async () => {
    await expect(
      exchange({ redirectUri: 'org.example.app:/other' }),
    ).rejects.toMatchObject({ oauthError: 'invalid_grant' });
    vi.mocked(redeemOAuthAuthorizationCode).mockResolvedValueOnce(codeData);
    await expect(
      exchangeOAuthAuthorizationCode({
        issuer,
        client: { ...client, id: 'c2' },
        code: 'code1',
        redirectUri: 'org.example.app:/cb',
        codeVerifier: verifier,
      }),
    ).rejects.toMatchObject({ oauthError: 'invalid_grant' });
  });

  it('omits refresh and id tokens without offline_access or openid', async () => {
    vi.mocked(redeemOAuthAuthorizationCode)
      .mockReset()
      .mockResolvedValueOnce({ ...codeData, scopes: ['posts:read'] });
    const response = await exchange();
    expect(response.refresh_token).toBeUndefined();
    expect(response.id_token).toBeUndefined();
    expect(issueOAuthRefreshToken).not.toHaveBeenCalled();
  });
});

describe('refresh_token grant', () => {
  const row = {
    id: 'r1',
    tokenHash: 'h',
    familyId: 'f1',
    clientId: 'c1',
    profileId: 'p1',
    accountId: 'a1',
    scopes: ['offline_access', 'posts:read'],
    accessTokenId: 'jti0',
    authTime: null,
    expiresAt: '',
    usedAt: null,
    revokedAt: null,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    vi.mocked(consumeOAuthRefreshToken).mockReset().mockResolvedValue(row);
    vi.mocked(findOAuthGrant).mockReset().mockResolvedValue({
      profileId: 'p1',
      clientId: 'c1',
      scopes: row.scopes,
      createdAt: '',
      updatedAt: '',
    });
  });

  it('rotates within the same family', async () => {
    const response = await exchangeOAuthRefreshToken({
      issuer,
      client,
      refreshToken: 'refresh1',
    });
    expect(response.refresh_token).toBe('refresh2');
    expect(consumeOAuthRefreshToken).toHaveBeenCalledWith('refresh1', 'c1');
    expect(vi.mocked(issueOAuthRefreshToken).mock.calls[0][0]).toMatchObject({
      familyId: 'f1',
      accessTokenId: 'jti1',
    });
  });

  it('refuses to widen the scope', async () => {
    await expect(
      exchangeOAuthRefreshToken({
        issuer,
        client,
        refreshToken: 'refresh1',
        scope: 'posts:write',
      }),
    ).rejects.toMatchObject({ oauthError: 'invalid_scope' });
  });

  it('fails once the user revoked the grant', async () => {
    vi.mocked(findOAuthGrant).mockResolvedValue(undefined);
    await expect(
      exchangeOAuthRefreshToken({ issuer, client, refreshToken: 'refresh1' }),
    ).rejects.toMatchObject({ oauthError: 'invalid_grant' });
  });
});

describe('revokeOAuthToken', () => {
  beforeEach(() => {
    vi.mocked(findOAuthRefreshToken).mockReset().mockResolvedValue(undefined);
    vi.mocked(revokeOAuthRefreshTokenFamily).mockReset().mockResolvedValue();
    vi.mocked(revokeAccessToken).mockReset().mockResolvedValue();
    vi.mocked(jwtUtil)
      .mockReset()
      .mockResolvedValue({
        verify: async () => ({
          payload: {
            jti: 'jti1',
            identities: { profile: 'p1', account: 'a1', client: 'c1' },
            scopes: [
              { scopeLevel: 'read', resource: { type: 'self', id: '*' } },
            ],
          },
        }),
      });
  });

  it('revokes the whole family for one of its own refresh tokens', async () => {
    vi.mocked(findOAuthRefreshToken).mockResolvedValue({
      familyId: 'f1',
      clientId: 'c1',
    } as never);
    await revokeOAuthToken({ client, token: 'r1' });
    expect(revokeOAuthRefreshTokenFamily).toHaveBeenCalledWith('f1');
    expect(revokeAccessToken).not.toHaveBeenCalled();
  });

  it('ignores refresh tokens of other clients (RFC 7009)', async () => {
    vi.mocked(findOAuthRefreshToken).mockResolvedValue({
      familyId: 'f1',
      clientId: 'c2',
    } as never);
    await revokeOAuthToken({ client, token: 'r1' });
    expect(revokeOAuthRefreshTokenFamily).not.toHaveBeenCalled();
    expect(revokeAccessToken).not.toHaveBeenCalled();
  });

  it('revokes a matching access token', async () => {
    await revokeOAuthToken({ client, token: 'access1' });
    expect(revokeAccessToken).toHaveBeenCalledWith('jti1');
  });

  it('ignores access tokens of other clients or without a jti', async () => {
    vi.mocked(jwtUtil).mockResolvedValue({
      verify: async () => ({
        payload: {
          jti: 'jti1',
          identities: { profile: 'p1', account: 'a1', client: 'c2' },
        },
      }),
    });
    await revokeOAuthToken({ client, token: 'access1' });
    expect(revokeAccessToken).not.toHaveBeenCalled();

    vi.mocked(jwtUtil).mockResolvedValue({ verify: async () => undefined });
    await revokeOAuthToken({ client, token: 'not-a-jwt' });
    expect(revokeAccessToken).not.toHaveBeenCalled();
  });
});

describe('oauthUserinfo', () => {
  const grant = (scopes: string[]) => ({
    profileId: 'p1',
    clientId: 'c1',
    scopes,
    createdAt: '',
    updatedAt: '',
  });
  // What `verifySignedAccessToken` resolves to: the Authorization payload.
  const validToken = {
    identities: { profile: 'p1', account: 'a1', client: 'c1' },
    scopes: [{ scopeLevel: 'read', resource: { type: 'self', id: 'p1' } }],
  };

  it('returns scope-gated claims for a valid delegated token', async () => {
    vi.mocked(verifySignedAccessToken).mockResolvedValue(validToken as never);
    vi.mocked(findOAuthGrant).mockResolvedValue(grant(['openid', 'email']));
    expect(await oauthUserinfo('access.jwt')).toEqual({
      sub: 'p1',
      email: 'ada@example.org',
      email_verified: true,
    });
  });

  it('withholds the email claim without the email scope', async () => {
    vi.mocked(verifySignedAccessToken).mockResolvedValue(validToken as never);
    vi.mocked(findOAuthGrant).mockResolvedValue(grant(['openid', 'profile']));
    expect(await oauthUserinfo('access.jwt')).toEqual({
      sub: 'p1',
      preferred_username: 'ada',
      name: 'ada',
    });
  });

  it('reports the email as unverified when not validated', async () => {
    vi.mocked(verifySignedAccessToken).mockResolvedValue(validToken as never);
    vi.mocked(findOAuthGrant).mockResolvedValue(grant(['openid', 'email']));
    vi.mocked(findAccount).mockResolvedValue({
      id: 'a1',
      email: 'ada@example.org',
      emailValidated: false,
    });
    expect(await oauthUserinfo('access.jwt')).toMatchObject({
      email: 'ada@example.org',
      email_verified: false,
    });
  });

  it('reports insufficient_scope for a valid token lacking openid', async () => {
    vi.mocked(verifySignedAccessToken).mockResolvedValue(validToken as never);
    vi.mocked(findOAuthGrant).mockResolvedValue(grant(['posts:read']));
    await expect(oauthUserinfo('access.jwt')).rejects.toMatchObject({
      oauthError: 'insufficient_scope',
    });
  });

  it('rejects an unresolvable token', async () => {
    vi.mocked(verifySignedAccessToken).mockResolvedValue(undefined);
    await expect(oauthUserinfo('garbage')).rejects.toMatchObject({
      oauthError: 'invalid_token',
    });
  });
});
