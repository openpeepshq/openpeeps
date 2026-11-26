import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OAuthAuthorizationRequest } from '@openpeepshq/common/types';

vi.mock('../clients', () => ({ findOAuthClient: vi.fn() }));
vi.mock('../grants', () => ({
  findOAuthGrant: vi.fn(),
  upsertOAuthGrant: vi.fn(),
}));
vi.mock('../codes', () => ({ issueOAuthAuthorizationCode: vi.fn() }));

import {
  decideOAuthAuthorization,
  describeOAuthAuthorization,
} from '../authorize';
import { findOAuthClient } from '../clients';
import { issueOAuthAuthorizationCode } from '../codes';
import { findOAuthGrant, upsertOAuthGrant } from '../grants';

const client = {
  id: 'c1',
  name: 'App',
  redirectUris: ['org.example.app:/cb'],
  confidential: false,
  firstParty: false,
  dynamic: true,
  clientUri: null,
  logoUri: null,
  createdAt: '2026-11-26T00:00:00.000Z',
  secretHash: null,
};

const request: OAuthAuthorizationRequest = {
  response_type: 'code',
  client_id: 'c1',
  redirect_uri: 'org.example.app:/cb',
  scope: 'openid posts:read',
  state: 'st',
  nonce: 'n',
  code_challenge: 'c'.repeat(43),
  code_challenge_method: 'S256',
};

const query = (url: string) => Object.fromEntries(new URL(url).searchParams);

beforeEach(() => {
  vi.mocked(findOAuthClient).mockReset().mockResolvedValue(client);
  vi.mocked(findOAuthGrant).mockReset().mockResolvedValue(undefined);
  vi.mocked(upsertOAuthGrant).mockReset();
  vi.mocked(issueOAuthAuthorizationCode).mockReset().mockResolvedValue('code1');
});

describe('describeOAuthAuthorization', () => {
  it('throws (never redirects) for unknown clients or redirect URIs', async () => {
    vi.mocked(findOAuthClient).mockResolvedValueOnce(undefined);
    await expect(describeOAuthAuthorization(request, 'p1')).rejects.toThrow(
      'Unknown client',
    );
    await expect(
      describeOAuthAuthorization(
        { ...request, redirect_uri: 'https://evil.example/cb' },
        'p1',
      ),
    ).rejects.toMatchObject({ oauthError: 'invalid_redirect_uri' });
  });

  it('reports a missing PKCE challenge to the trusted redirect URI', async () => {
    const info = await describeOAuthAuthorization(
      { ...request, code_challenge: undefined },
      'p1',
    );
    expect(info.status).toBe('redirect');
    if (info.status !== 'redirect') return;
    expect(query(info.redirectUrl)).toMatchObject({
      error: 'invalid_request',
      state: 'st',
    });
  });

  it('rejects full access for third-party clients', async () => {
    const info = await describeOAuthAuthorization(
      { ...request, scope: 'openid *:admin' },
      'p1',
    );
    expect(info.status === 'redirect' && query(info.redirectUrl).error).toBe(
      'invalid_scope',
    );
  });

  it('allows full access for first-party clients but still asks once', async () => {
    vi.mocked(findOAuthClient).mockResolvedValue({
      ...client,
      firstParty: true,
    });
    const info = await describeOAuthAuthorization(
      { ...request, scope: 'openid *:admin' },
      'p1',
    );
    expect(info).toMatchObject({ status: 'consent', autoApprove: false });
  });

  it('auto-approves only when an earlier grant covers every scope', async () => {
    vi.mocked(findOAuthGrant).mockResolvedValue({
      profileId: 'p1',
      clientId: 'c1',
      scopes: ['openid', 'posts:read'],
      createdAt: '',
      updatedAt: '',
    });
    expect(await describeOAuthAuthorization(request, 'p1')).toMatchObject({
      autoApprove: true,
    });
    expect(
      await describeOAuthAuthorization(
        { ...request, scope: 'openid posts:write' },
        'p1',
      ),
    ).toMatchObject({ autoApprove: false });
  });
});

describe('decideOAuthAuthorization', () => {
  it('redirects access_denied without a code when declined', async () => {
    const url = await decideOAuthAuthorization({
      request,
      approve: false,
      profileId: 'p1',
    });
    expect(query(url)).toMatchObject({ error: 'access_denied', state: 'st' });
    expect(issueOAuthAuthorizationCode).not.toHaveBeenCalled();
    expect(upsertOAuthGrant).not.toHaveBeenCalled();
  });

  it('records consent and returns the code with state', async () => {
    const url = await decideOAuthAuthorization({
      request,
      approve: true,
      profileId: 'p1',
      accountId: 'a1',
      authTime: 100,
    });
    expect(query(url)).toEqual({ code: 'code1', state: 'st' });
    expect(upsertOAuthGrant).toHaveBeenCalledWith('p1', 'c1', [
      'openid',
      'posts:read',
    ]);
    expect(issueOAuthAuthorizationCode).toHaveBeenCalledWith({
      clientId: 'c1',
      redirectUri: 'org.example.app:/cb',
      profileId: 'p1',
      accountId: 'a1',
      scopes: ['openid', 'posts:read'],
      codeChallenge: 'c'.repeat(43),
      nonce: 'n',
      authTime: 100,
    });
  });
});
