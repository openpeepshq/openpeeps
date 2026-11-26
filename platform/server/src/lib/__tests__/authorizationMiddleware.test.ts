import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@riddl/core';
import type { Authorization } from '@openpeepshq/common/types';

const mocks = vi.hoisted(() => ({
  payload: undefined as (Authorization & { jti?: string }) | undefined,
  isRevoked: vi.fn(async () => false),
}));

vi.mock('@openpeepshq/core/jwt', () => ({
  jwtUtil: async () => ({
    verify: async () =>
      mocks.payload ? { payload: mocks.payload } : undefined,
  }),
}));
vi.mock('@openpeepshq/core/accessTokens', () => ({
  isRevoked: mocks.isRevoked,
}));
vi.mock('../auth', () => ({
  loadCurrentProfile: async () => ({ id: 'p1', type: 'local' }),
  loadCurrentAccount: async () => ({ id: 'a1' }),
}));

import middleware from '../middleware/authorization';

const run = async (method: string, path: string) => {
  const url = new URL(`https://peeps.example/api/openpeeps/core/v1/${path}`);
  const event = {
    request: new Request(url, {
      method,
      headers: { authorization: 'Bearer tok' },
    }),
    url,
    context: {},
  } as unknown as RequestEvent;
  await middleware.pre!(event);
  return event.context;
};

const delegated = (
  scopes: Authorization['scopes'],
): Authorization & { jti: string } => ({
  identities: { profile: 'p1', account: 'a1', client: 'c1' },
  scopes,
  jti: 'jti1',
});

const postsRead = [
  {
    scopeLevel: 'read' as const,
    resource: { type: 'posts' as const, id: '*' },
  },
];

beforeEach(() => {
  mocks.isRevoked.mockReset().mockResolvedValue(false);
});

describe('authorization middleware', () => {
  it('leaves session tokens untouched', async () => {
    mocks.payload = {
      identities: { profile: 'p1' },
      scopes: [{ scopeLevel: 'admin', resource: { type: '*', id: '*' } }],
      jti: 'j',
    };
    expect((await run('GET', 'admin/config')).currentProfile).toBeDefined();
    expect(mocks.isRevoked).not.toHaveBeenCalled();
  });

  it('honours a delegated token on routes its scope covers', async () => {
    mocks.payload = delegated(postsRead);
    const context = await run('GET', 'posts/123');
    expect(context.currentProfile).toEqual({ id: 'p1', type: 'local' });
    expect(context.authData.scopes).toEqual(postsRead);
  });

  it('treats a delegated token as absent outside its scope', async () => {
    mocks.payload = delegated(postsRead);
    for (const [method, path] of [
      ['POST', 'posts'],
      ['GET', 'groups'],
      ['GET', 'admin/config'],
      ['GET', 'oauth/grants'],
      ['POST', 'auth/refresh'],
    ]) {
      const context = await run(method, path);
      expect(context.authorization).toBeUndefined();
      expect(context.authData).toEqual({ scopes: [] });
    }
  });

  it('rejects revoked delegated tokens', async () => {
    mocks.payload = delegated(postsRead);
    mocks.isRevoked.mockResolvedValue(true);
    expect((await run('GET', 'posts/1')).authorization).toBeUndefined();
    expect(mocks.isRevoked).toHaveBeenCalledWith('jti1');
  });

  it('lets first-party full-access tokens reach every route', async () => {
    mocks.payload = delegated([
      { scopeLevel: 'admin', resource: { type: '*', id: '*' } },
    ]);
    expect((await run('GET', 'admin/config')).authorization).toBeDefined();
  });
});
