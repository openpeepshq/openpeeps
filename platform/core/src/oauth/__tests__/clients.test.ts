import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  lifetime: 3_153_600_000,
  rows: [] as Record<string, unknown>[],
  inserted: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
}));

vi.mock('../../config', () => ({
  config: async () => ({
    oauth: {
      dynamicRegistration: false,
      clientSecretLifetimeSeconds: state.lifetime,
    },
  }),
}));
vi.mock('../../db', () => ({
  allpeepDb: async () => {
    const select = {
      from: () => select,
      orderBy: () => select,
      where: () => select,
      limit: async () => state.rows,
    };
    return {
      db: {
        select: () => select,
        insert: () => ({
          values: (values: Record<string, unknown>) => {
            state.inserted.push(values);
            const row = { firstParty: false, dynamic: false, ...values };
            state.rows.push(row);
            return { returning: async () => [row] };
          },
        }),
        update: () => ({
          set: (values: Record<string, unknown>) => {
            state.updates.push(values);
            return { where: async () => undefined };
          },
        }),
        delete: () => ({ where: async () => [] }),
      },
    };
  },
}));
vi.mock('../refreshTokens', () => ({
  revokeOAuthRefreshTokens: vi.fn(async () => undefined),
}));

import { sha256Hex } from '../crypto';
import {
  authenticateOAuthClient,
  createOAuthClient,
  rotateOAuthClientSecret,
  toPublicOAuthClient,
} from '../clients';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'App',
  redirectUris: ['org.example.app:/cb'],
  secretHash: sha256Hex('s1'),
  secretExpiresAt: null,
  firstParty: false,
  dynamic: false,
  clientUri: null,
  logoUri: null,
  createdAt: '2026-11-26T00:00:00.000Z',
  updatedAt: '2026-11-26T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  state.rows = [];
  state.inserted = [];
  state.updates = [];
  state.lifetime = 3_153_600_000;
});

describe('createOAuthClient', () => {
  it('issues a secret for confidential clients and never exposes it', async () => {
    const created = await createOAuthClient({
      name: 'App',
      redirectUris: ['org.example.app:/cb'],
      confidential: true,
    });
    expect(typeof created.clientSecret).toBe('string');
    expect(state.inserted[0].secretHash).toBe(sha256Hex(created.clientSecret!));
    // admin-registered secrets do not expire
    expect(state.inserted[0].secretExpiresAt).toBeNull();
    expect(created).not.toHaveProperty('secretHash');
    expect(created).not.toHaveProperty('secretExpiresAt');
  });

  it('sets an expiry for dynamic confidential clients from the lifetime', async () => {
    state.lifetime = 3_600;
    const before = Date.now();
    await createOAuthClient(
      {
        name: 'App',
        redirectUris: ['org.example.app:/cb'],
        confidential: true,
      },
      { dynamic: true },
    );
    const expiry = new Date(state.inserted[0].secretExpiresAt as string);
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 3_600_000);
  });

  it('keeps admin secrets non-expiring even when the lifetime is set', async () => {
    state.lifetime = 3_600;
    await createOAuthClient(
      {
        name: 'App',
        redirectUris: ['org.example.app:/cb'],
        confidential: true,
      },
      { dynamic: true },
    );
    await createOAuthClient({
      name: 'App',
      redirectUris: ['org.example.app:/cb'],
      confidential: true,
    });
    expect(state.inserted[1].secretExpiresAt).toBeNull();
  });
});

describe('authenticateOAuthClient', () => {
  it('accepts a valid confidential secret', async () => {
    state.rows = [row()];
    await expect(authenticateOAuthClient('c1', 's1')).resolves.toMatchObject({
      id: 'c1',
      confidential: true,
    });
  });

  it('rejects a wrong secret', async () => {
    state.rows = [row()];
    await expect(authenticateOAuthClient('c1', 'wrong')).rejects.toMatchObject({
      oauthError: 'invalid_client',
    });
  });

  it('rejects an expired secret even if it matches', async () => {
    state.rows = [
      row({ secretExpiresAt: new Date(Date.now() - 1000).toISOString() }),
    ];
    await expect(authenticateOAuthClient('c1', 's1')).rejects.toMatchObject({
      oauthError: 'invalid_client',
      message: 'The client secret has expired',
    });
  });

  it('accepts a public client with no secret', async () => {
    state.rows = [row({ secretHash: null })];
    await expect(
      authenticateOAuthClient('c1', undefined),
    ).resolves.toMatchObject({ confidential: false });
  });

  it('rejects an unknown client', async () => {
    state.rows = [];
    await expect(
      authenticateOAuthClient('nope', undefined),
    ).rejects.toMatchObject({ oauthError: 'invalid_client' });
  });
});

describe('rotateOAuthClientSecret', () => {
  it('replaces the hash and returns a new secret for confidential clients', async () => {
    state.rows = [row()];
    const next = await rotateOAuthClientSecret('c1');
    expect(next).toBeTruthy();
    expect(next).not.toBe('s1');
    expect(state.updates[0].secretHash).toBe(sha256Hex(next!));
    // admin-registered: no expiry applied
    expect(state.updates[0].secretExpiresAt).toBeNull();
  });

  it('applies the lifetime to dynamic clients on rotation', async () => {
    state.rows = [row({ dynamic: true })];
    await rotateOAuthClientSecret('c1');
    expect(state.updates[0].secretExpiresAt).toBeTruthy();
  });

  it('returns undefined for public and missing clients', async () => {
    state.rows = [row({ secretHash: null })];
    await expect(rotateOAuthClientSecret('c1')).resolves.toBeUndefined();
    state.rows = [];
    await expect(rotateOAuthClientSecret('c1')).resolves.toBeUndefined();
    expect(state.updates).toHaveLength(0);
  });
});

describe('toPublicOAuthClient', () => {
  it('strips the secret hash and expiry', () => {
    const record = {
      id: 'c1',
      name: 'App',
      redirectUris: ['org.example.app:/cb'],
      confidential: true,
      firstParty: false,
      dynamic: false,
      createdAt: '2026-11-26T00:00:00.000Z',
      secretHash: 'hash',
      secretExpiresAt: '2027-01-01T00:00:00.000Z',
    };
    const publicClient = toPublicOAuthClient(record);
    expect(publicClient).not.toHaveProperty('secretHash');
    expect(publicClient).not.toHaveProperty('secretExpiresAt');
    expect(publicClient).toMatchObject({ id: 'c1', confidential: true });
  });
});
