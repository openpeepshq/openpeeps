import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateConfigValues } from './index';

const { loadConfig, storeConfig } = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  storeConfig: vi.fn(),
}));

vi.mock('./db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: (...args: unknown[]) => storeConfig(...args),
}));

vi.mock('../events', () => ({
  hub: { emit: vi.fn() },
}));

describe('updateConfigValues', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
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

  it('restores a real secret when the admin form echoes back the placeholder', async () => {
    loadConfig.mockResolvedValue({
      config: {
        sso: {
          github: [
            {
              id: 'github',
              name: 'GitHub',
              clientId: 'existing-client-id',
              clientSecret: 'real-secret-value',
            },
          ],
        },
      },
    });

    // Admin form adds a second (gitlab) entry but echoes back the
    // sanitized placeholder for the github entry's untouched secret.
    await updateConfigValues(
      {
        sso: {
          github: [
            {
              id: 'github',
              name: 'GitHub',
              clientId: 'existing-client-id',
              clientSecret: '*********',
            },
          ],
          gitlab: [
            {
              id: 'gitlab',
              name: 'GitLab',
              clientId: 'new-gitlab-id',
              clientSecret: 'new-gitlab-secret',
            },
          ],
        },
      },
      'openpeeps',
      'core',
    );

    const [, stored] = storeConfig.mock.calls[0] as [string, { config: never }];
    expect(stored.config.sso.github[0].clientSecret).toBe('real-secret-value');
    expect(stored.config.sso.gitlab[0].clientSecret).toBe('new-gitlab-secret');
  });
});
