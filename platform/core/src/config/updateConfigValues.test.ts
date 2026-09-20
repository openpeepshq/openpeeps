import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateConfigValues } from './index';

const { loadConfig, storeConfig, resetServerInfo } = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  storeConfig: vi.fn(),
  resetServerInfo: vi.fn(),
}));

vi.mock('./db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: (...args: unknown[]) => storeConfig(...args),
}));

vi.mock('../events', () => ({
  hub: { emit: vi.fn() },
}));

vi.mock('../server/stablePublicServerInfo', () => ({
  stablePublicServerInfo: { reset: resetServerInfo },
}));

describe('updateConfigValues', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
    resetServerInfo.mockReset();
    storeConfig.mockResolvedValue({ config: {} });
  });

  it('merges a sparse patch into existing stored overrides', async () => {
    loadConfig.mockResolvedValue({
      config: {
        theme: {
          light: {
            logoSmall: 'https://example.com/logo.png',
            primaryHex: '#31b28c',
          },
        },
        info: { name: 'Inside AllPeeP', tagLine: 'old' },
      },
    });

    await updateConfigValues(
      { info: { tagLine: 'new tagline' } },
      'openpeeps',
      'community',
    );

    expect(loadConfig).toHaveBeenCalledWith('openpeeps-community');
    expect(storeConfig).toHaveBeenCalledWith('openpeeps-community', {
      config: {
        theme: {
          light: {
            logoSmall: 'https://example.com/logo.png',
            primaryHex: '#31b28c',
          },
        },
        info: { name: 'Inside AllPeeP', tagLine: 'new tagline' },
      },
    });
    expect(resetServerInfo).toHaveBeenCalledOnce();
  });

  it('restores stored secrets when a sanitized array patch uses the placeholder', async () => {
    const storedProvider = {
      id: 'gh',
      name: 'GitHub',
      kind: 'github',
      clientId: 'abc',
      clientSecret: 'stored-secret',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userinfoUrl: 'https://api.github.com/user',
    };
    loadConfig.mockResolvedValue({
      config: { sso: { oidc: [storedProvider] } },
    });

    await updateConfigValues(
      {
        sso: {
          oidc: [{ ...storedProvider, clientSecret: '*********' }],
        },
      },
      'openpeeps',
      'core',
    );

    expect(storeConfig).toHaveBeenCalledWith('openpeeps-core', {
      config: { sso: { oidc: [storedProvider] } },
    });
  });

  it('does not wipe theme when only info is patched onto an empty store', async () => {
    loadConfig.mockResolvedValue(undefined);

    await updateConfigValues(
      { info: { tagLine: 'only this' } },
      'openpeeps',
      'community',
    );

    expect(storeConfig).toHaveBeenCalledWith('openpeeps-community', {
      config: { info: { tagLine: 'only this' } },
    });
  });
});
