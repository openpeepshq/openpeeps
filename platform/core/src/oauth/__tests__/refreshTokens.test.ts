import { beforeEach, describe, expect, it, vi } from 'vitest';

// Fake drizzle chain: selects answer `rows`, updates answer the next queued
// `returning` result and record their `set` payloads.
const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Array<Record<string, unknown>>>,
  sets: [] as Array<Record<string, unknown>>,
}));
vi.mock('../../db', () => ({
  allpeepDb: async () => {
    const select = {
      from: () => select,
      where: () => select,
      limit: async () => state.rows,
    };
    const update = {
      set: (values: Record<string, unknown>) => {
        state.sets.push(values);
        return update;
      },
      where: () => update,
      returning: async () => state.updates.shift() ?? [],
    };
    return { db: { select: () => select, update: () => update } };
  },
}));
vi.mock('../../accessTokens/mutations', () => ({ revokeAccessToken: vi.fn() }));

import { revokeAccessToken } from '../../accessTokens/mutations';
import { consumeOAuthRefreshToken } from '../refreshTokens';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  familyId: 'f1',
  clientId: 'c1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  usedAt: null,
  revokedAt: null,
  ...overrides,
});

beforeEach(() => {
  state.rows = [];
  state.updates = [];
  state.sets = [];
  vi.mocked(revokeAccessToken).mockReset();
});

describe('consumeOAuthRefreshToken', () => {
  it('marks a fresh token used and returns it', async () => {
    state.rows = [row()];
    state.updates = [[{ id: 'r1' }]];
    await expect(consumeOAuthRefreshToken('t', 'c1')).resolves.toMatchObject({
      id: 'r1',
    });
    expect(state.sets[0]).toHaveProperty('usedAt');
  });

  it('revokes the whole family when a used token is replayed', async () => {
    state.rows = [row({ usedAt: new Date().toISOString() })];
    state.updates = [[{ accessTokenId: 'jti1' }, { accessTokenId: 'jti2' }]];
    await expect(consumeOAuthRefreshToken('t', 'c1')).rejects.toMatchObject({
      oauthError: 'invalid_grant',
      message: 'Refresh token was already used',
    });
    expect(state.sets[0]).toHaveProperty('revokedAt');
    expect(revokeAccessToken).toHaveBeenCalledWith('jti1');
    expect(revokeAccessToken).toHaveBeenCalledWith('jti2');
  });

  it('treats losing a concurrent redemption as reuse', async () => {
    state.rows = [row()];
    state.updates = [[], []];
    await expect(consumeOAuthRefreshToken('t', 'c1')).rejects.toMatchObject({
      oauthError: 'invalid_grant',
    });
    expect(state.sets.map(Object.keys)).toEqual([['usedAt'], ['revokedAt']]);
  });

  it('rejects unknown, foreign, revoked or expired tokens', async () => {
    await expect(consumeOAuthRefreshToken('t', 'c1')).rejects.toThrow();
    for (const overrides of [
      { clientId: 'c2' },
      { revokedAt: new Date().toISOString() },
      { expiresAt: new Date(Date.now() - 1000).toISOString() },
    ]) {
      state.rows = [row(overrides)];
      await expect(consumeOAuthRefreshToken('t', 'c1')).rejects.toMatchObject({
        oauthError: 'invalid_grant',
      });
    }
    expect(state.sets).toEqual([]);
  });
});
