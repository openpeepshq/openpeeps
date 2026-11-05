import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jwtUtil } from '../jwt';
import { config } from '../config';
import {
  ATPROTO_ACCESS_SCOPE,
  ATPROTO_TOKEN_AUD,
  createAtprotoTokens,
  verifyAtprotoAccess,
  verifyAtprotoRefresh,
} from './sessions';

vi.mock('../config', () => ({ config: vi.fn() }));

const mockConfig = vi.mocked(config);

describe('atproto sessions', () => {
  beforeEach(() => {
    mockConfig.mockReset();
    mockConfig.mockResolvedValue({
      secrets: { jwt: 'community-secret' },
      atproto: { handleDomain: 'community.example' },
    } as never);
  });

  it('issues tokens that verify as AT sessions and not as community JWTs', async () => {
    const tokens = await createAtprotoTokens({
      did: 'did:web:community.example:atproto:users:alice',
      profileId: 'profile-1',
      scope: ATPROTO_ACCESS_SCOPE,
    });
    const access = await verifyAtprotoAccess(tokens.accessJwt);
    expect(access?.did).toBe('did:web:community.example:atproto:users:alice');
    expect(access?.profileId).toBe('profile-1');
    expect(access?.scope).toBe(ATPROTO_ACCESS_SCOPE);
    expect(access?.jkt).toBeUndefined();

    const community = await jwtUtil();
    expect(await community.verify(tokens.accessJwt)).toBeUndefined();

    const refresh = await verifyAtprotoRefresh(tokens.refreshJwt);
    expect(refresh?.did).toBe(access?.did);
    expect(await verifyAtprotoAccess(tokens.refreshJwt)).toBeUndefined();
  });

  it('binds DPoP thumbprints onto access tokens', async () => {
    const tokens = await createAtprotoTokens({
      did: 'did:web:community.example:atproto:users:alice',
      profileId: 'profile-1',
      scope: ATPROTO_ACCESS_SCOPE,
      jkt: 'thumbprint',
    });
    const access = await verifyAtprotoAccess(tokens.accessJwt);
    expect(access?.jkt).toBe('thumbprint');
    expect(ATPROTO_TOKEN_AUD).toBe('atproto');
  });
});
