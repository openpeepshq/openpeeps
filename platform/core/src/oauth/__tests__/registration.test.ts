import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  dynamicRegistration: false,
  clientSecretLifetimeSeconds: 3_153_600_000,
}));
vi.mock('../../config', () => ({
  config: async () => ({
    oauth: {
      dynamicRegistration: state.dynamicRegistration,
      clientSecretLifetimeSeconds: state.clientSecretLifetimeSeconds,
    },
  }),
}));
vi.mock('../clients', () => ({
  createOAuthClient: vi.fn(async (input: Record<string, unknown>) => ({
    id: 'c1',
    name: input.name,
    redirectUris: input.redirectUris,
    confidential: input.confidential,
    firstParty: false,
    dynamic: true,
    createdAt: '2026-11-26T00:00:00.000Z',
    clientSecret: input.confidential ? 'secret' : undefined,
  })),
}));

import { createOAuthClient } from '../clients';
import { registerOAuthClient } from '../registration';

beforeEach(() => {
  state.dynamicRegistration = true;
  state.clientSecretLifetimeSeconds = 3_153_600_000;
  vi.mocked(createOAuthClient).mockClear();
});

describe('registerOAuthClient', () => {
  it('is refused while the admin flag is off', async () => {
    state.dynamicRegistration = false;
    await expect(
      registerOAuthClient({ redirect_uris: ['org.example.app:/cb'] }),
    ).rejects.toMatchObject({ oauthError: 'registration_disabled' });
    expect(createOAuthClient).not.toHaveBeenCalled();
  });

  it('rejects metadata without redirect URIs', async () => {
    await expect(
      registerOAuthClient({ client_name: 'App' }),
    ).rejects.toMatchObject({ oauthError: 'invalid_client_metadata' });
  });

  it('registers a public client as dynamic and never first-party', async () => {
    const response = await registerOAuthClient({
      client_name: 'App',
      redirect_uris: ['org.example.app:/cb'],
      firstParty: true,
    });
    expect(createOAuthClient).toHaveBeenCalledWith(
      expect.not.objectContaining({ firstParty: true }),
      { dynamic: true },
    );
    expect(response).toMatchObject({
      client_id: 'c1',
      client_id_issued_at: 1_795_651_200,
      token_endpoint_auth_method: 'none',
      redirect_uris: ['org.example.app:/cb'],
    });
    expect(response).not.toHaveProperty('client_secret');
  });

  it('reports a non-expiring secret when the lifetime is disabled', async () => {
    state.clientSecretLifetimeSeconds = 0;
    const response = await registerOAuthClient({
      redirect_uris: ['https://app.example/cb'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    expect(response).toMatchObject({
      client_name: 'Unnamed app',
      client_secret: 'secret',
      client_secret_expires_at: 0,
    });
  });

  it('reports the secret expiry when a lifetime is configured', async () => {
    state.clientSecretLifetimeSeconds = 3_600;
    const before = Math.floor(Date.now() / 1000);
    const response = await registerOAuthClient({
      redirect_uris: ['https://app.example/cb'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    const expiry = response.client_secret_expires_at as number;
    expect(expiry).toBeGreaterThan(before);
    expect(expiry).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3_600);
  });
});
